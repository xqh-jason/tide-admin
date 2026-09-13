# 设计文档：Refresh Token + 登录刷新凭证表 + 认证中间件改造

> 日期：2026-09-13
> 范围：后端 tide-server（认证链路 + 新增 refresh_token 域）与前端 tide-admin（一行开关）。
> 本设计是三轮分析（refresh token 必要性 → 会话表 → cache 职责收敛）的落地方案；
> 分工按 AGENTS.md 约定：AI 交付本文档 + 基础设施 + 失败测试 + 签名桩，
> 业务实现（repo/service/middleware/handler 主体）由用户填充，AI 最终 review。

## 1. 背景与目标

现状：单 JWT（7 天）+ 登出 cache 黑名单（MemoryCache，重启即失）+ 无刷新机制。
前端 vben 刷新链路已全部预埋（`authenticateResponseInterceptor` / `refreshTokenApi`
打 `POST /auth/refresh` + `withCredentials: true`），仅差后端端点与开关。

**目标（加粗）**：access token 缩短到 2h、refresh token（HttpOnly Cookie，7 天）服务端可吊销、
活跃用户无感续期、管理员可查看在线会话并强制下线；cache 收敛为纯临时态（仅验证码）。

关键决策（已与用户确认）：

- **v1 refresh token 不轮换**：每会话固定一个 refresh token（7 天），刷新幂等，
  多标签页零竞态；登出 / 强制下线吊销。轮换升级路径见 §8。
- **会话表承载全部凭证状态**（refresh token hash / 吊销），cache 不再持有安全状态。

## 2. 契约总表（前端已预埋，按此实现即通）

| 功能 | 端点 | 请求 | 成功响应 | 失败响应 |
|---|---|---|---|---|
| 登录（改造） | `POST /auth/login` | 不变 | 响应体不变 `{code:1,data:{token}}`；**额外** `Set-Cookie: refreshToken=<32位hex>; Path=/; HttpOnly; SameSite=Lax; Max-Age=<refresh_ttl_seconds>` | 不变（200 + code:0） |
| 刷新（新增） | `POST /auth/refresh` | 公开端点，无 body，浏览器自动携带 Cookie（`withCredentials: true`） | **HTTP 200，响应体 = 裸 token 字符串**（`Json(token)` → `"eyJ..."`，axios 自动 parse 去引号；**不是** `{code,data,message}` 包裹） | **真 HTTP 401** + `ApiResponse::fail` body（直写 Response，勿走 `AppError`） |
| 登出（改造） | `POST /auth/logout` | 不变（Bearer） | 不变；后端行为改为：吊销当前会话（`revoked_by=0`，reason=「用户登出」）+ `Set-Cookie: refreshToken=; Max-Age=0`；**删除黑名单写入** | 不变 |
| 会话列表（新增） | `POST /refresh-token/list` | `{page?, pageSize?, username?, onlineOnly?}` | `PageResult<RefreshTokenResp>` | 200 + code:0 |
| 物理删除（新增） | `POST /refresh-token/delete` | `{id}` | 仅删**死记录**（已吊销或已过期）；仍在线报「会话仍在线，请先强制下线」（防无痕踢人绕过吊销审计） | 200 + code:0 |
| 批量物理删除（新增） | `POST /refresh-token/delete-batch` | `{ids}` | 活跃行静默跳过，返回受影响数 | 200 + code:0 |
| 强制下线（新增） | `POST /refresh-token/force-logout` | `{id}` | 吊销该凭证（`revoked_by`=操作人，reason=「管理员强制下线」），保留审计痕迹 | 200 + code:0 |

前端仅一行改动：`apps/web-ele/src/preferences.ts` 覆盖 `app.enableRefreshToken: true`
（开关早开无副作用：无 `/auth/refresh` 时 401 → 刷新失败 → 仍走 `doReAuthenticate`）。

**失败必须是真 401 的原因**：`infra/catcher.rs` 会把 4xx/5xx 改写为 200 + code:0，
`AppError`（Biz/Internal）经 Writer 恒 200；refresh handler 必须直写
`res.status_code(UNAUTHORIZED)`（全仓 401 唯一现役来源是 `middleware/auth.rs::unauthorized`）。

## 3. 表设计 `sys_refresh_token`

迁移 `migrations/src/m20260913_000002_create_sys_refresh_token.rs`（原生 DDL，对齐基线风格；
不套软删——会话是时效数据，按日志类处理，过期由定时任务物理清理）：

| 列 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| user_id | bigint unsigned NOT NULL | idx |
| username | varchar(64) NOT NULL DEFAULT '' | 冗余，对齐 sys_login_log，列表页免 join |
| refresh_token_hash | char(64) NOT NULL | SHA-256 hex，UNIQUE；不存明文 |
| ip / agent | varchar(64/255) DEFAULT '' | 登录环境 |
| last_active_at | datetime NOT NULL DEFAULT CURRENT_TIMESTAMP | 在线判定依据（5 分钟内视为在线） |
| expires_at | datetime NOT NULL | 会话过期 = 登录时刻 + refresh_ttl；idx |
| revoked_at | datetime NULL | NULL=有效 |
| revoked_by | bigint unsigned NOT NULL DEFAULT 0 | 0=本人登出/系统；>0=管理员 user_id（对齐人字段约定） |
| revoke_reason | varchar(255) DEFAULT '' | |
| created_at / updated_at | datetime | updated_at ON UPDATE CURRENT_TIMESTAMP |

## 4. 认证链路改造（后端 tide-server）

### 4.1 JWT（`src/utils/jwt.rs`）

- `Claims` 增加 `refresh_token_id: u64`；`sign()` 增加同名参数。
- 旧 token（无该字段）反序列化自然失败 → 发版即全员重登，无需迁移逻辑。

### 4.2 `AuthRequired` 中间件（`src/middleware/auth.rs`）

新校验链（替换黑名单 + `ensure_user_active` 两步）：

1. `bearer_token` → `jwt::verify`（签名 + 过期 + 含 refresh_token_id）；
2. **单条合并查询**（repo：`refresh_token::repo::find_usable_with_user_by_id(db, refresh_token_id)`，
   一条 SQL：`sys_refresh_token` 未吊销（`revoked_at IS NULL`）+ 未过期
   （`expires_at > NOW()`）JOIN `sys_user` 存在/未软删/启用）；查无 → 401；
3. `AuthUser` 增加 `refresh_token_id` 字段写入 Depot；
4. `last_active_at` 60s 节流回写：cache 键 `refresh_token:touch:{refresh_token_id}`（TTL 60s），
   键不存在则 `touch_last_active_at` + `cache.set`——丢失无害（最多多一次 UPDATE）。

黑名单检查段（auth.rs 79-84 行）删除；`ensure_user_active` 若无其他调用方可一并移除，
其 4 个既有单测随之迁移为合并查询的行为断言。

### 4.3 登录 / 刷新 / 登出（`src/modules/auth/`）

- `service::login`：成功路径尾部创建会话（`refresh_token::service::create_refresh_token`：
  生成 `uuid::Uuid::new_v4().simple()` 明文 → SHA-256 落库）→ 以新 `refresh_token_id`
  签发 JWT → 返回 `(LoginResp, refresh_token 明文)`；`api::login` 把明文设进
  `Set-Cookie` 头（响应体不含 refresh_token，防 JS 读取）。
- `service::refresh(db, jwt_cfg, refresh_token) -> Result<String, AppError>`：
  hash → `find_usable_by_refresh_hash` → 无/吊销/过期/用户失效 → 业务侧判失败；
  重查 `find_roles_by_user_id` 取**最新角色** → 签发新 access token（同一 refresh_token_id）→ 回写 `last_active_at`。
- `api::refresh`：读 Cookie（私有纯函数 `extract_refresh_cookie`）→ 调 service →
  成功 `res.render(Json(token))`；失败直写 401。不挂 `AuthRequired`（公开端点，
  与 login 同层挂载）；**不进 API_SEEDS**（公开契约端点惯例）。
- `api::logout`：从 Depot `AuthUser.refresh_token_id` 吊销会话 + 清 Cookie；黑名单代码删除。

### 4.4 刷新凭证管理域（`src/modules/refresh_token/` 五件套，Protected 三件套挂载）

- 端点（路由顺序 list → delete → delete-batch → force-logout，特殊动作殿后）：
  `list_refresh_tokens`（`page_refresh_tokens`）、`delete_refresh_token`（物理删除，
  仅死记录；活跃记录报「会话仍在线，请先强制下线」）、`delete_refresh_token_batch`
  （批量物理删，活跃行静默跳过）、`force_logout_refresh_token`（强制下线 = 吊销盖章；
  无 create/update——凭证由登录创建，删除仅面向历史）。
- repo：`create_refresh_token` / `find_usable_with_user_by_id` / `find_usable_with_user_by_hash` /
  `find_by_id` / `find_page`（filter：username like、online_only） / `revoke`（盖章 revoked_at/by/reason） /
  `delete_by_id` / `delete_batch`（SQL 内置 dead 过滤） / `touch_last_active_at` /
  `delete_expired_before`（分批物理删，模板 login_log）。
- `seed.rs`：API_SEEDS 登记 `/api/v1/refresh-token/{list,delete,delete-batch,force-logout}` ×4（组「刷新凭证」）；
  菜单种子已就位：SystemSession 页面（sort 11，/system/session）+ 强制下线/删除两个按钮权限码（system:session:force-logout / system:session:delete），super 角色自动绑定；前端页面 apps/web-ele/src/views/system/session 由使用方实现。

### 4.5 配置与清理任务

- `config.rs`：`Jwt` 增加 `refresh_ttl_seconds: i64`（`#[serde(default = ...)]` 默认 604800）
  + `Config::load` 校验 >0；`config.toml`：`ttl_seconds` 604800→**7200**、新增 `refresh_ttl_seconds = 604800`。
- `src/task/refresh_token_cleanup.rs`（模板 login_log_cleanup）：删 `expires_at < now-30d`
  （保留 30 天死会话供审计）；`task/mod.rs` 三处登记；seed.rs 种 `sys_job`
  「刷新凭证每日清理」（`0 30 4 * * *`）。

### 4.6 cache 最终职责

仅剩验证码 + 会话活跃节流键（均为临时态，重启丢失无害）。黑名单退役后
cache 不持有任何安全状态；Redis 降级为多实例部署时的可选扩展（触发条件：验证码跨实例共享）。

## 5. 依赖

- `sha2 = "0.10"`（Cargo.lock 已有传递依赖 0.10.9，无新下载）；随机串用现有 `uuid v4 simple`。
- salvo cookie feature **不启用**：Cookie 读写手写 header 解析/拼装（rsproxy 镜像缺版本先例）。

## 6. 测试清单（AI 交付失败测试，用户实现后转绿）

| 层 | 测试 | 红的原因 |
|---|---|---|
| jwt | refresh_token_id claim 往返 | sign 签名已适配（基础设施，应绿） |
| refresh_token/repo | 创建回读 / hash 查找按未吊销未过期+用户有效过滤 / 吊销盖章 / find_page 过滤 / 物理删（死记录）与批量跳活跃 / 过期清理 | repo 体 `todo!()` |
| refresh_token/service | 分页透传 / 强制下线盖章 revoked_by / 物理删死记录校验 / 批量跳活跃 | service 体 `todo!()` |
| auth/service | 登录创建会话行 + 返回非空 refresh_token / refresh 成功签发同 refresh_token_id / refresh 遇吊销·过期·未知报错 | login 会话创建未接、refresh 桩 |
| middleware（黑盒 FlowCtrl） | 有效全链 200（回归锚）/ 吊销凭证 401 / 过期凭证 401 / 无 refresh_token_id 401 | 中间件仍走黑名单 |
| auth/api | `extract_refresh_cookie` 纯函数解析 | AI 直接实现（应绿） |

已知中间态：交接期间 login 签发 `refresh_token_id=0` → 受保护接口 401，属预期红态。

## 7. 验证

1. `migrations/` 目录：`DATABASE_URL='mysql://root:root@localhost:3307/tide_server' cargo run -- up`
2. 后端：`cargo fmt --check` && `cargo check` && `cargo test`（全绿）
3. 冒烟：登录抓 `Set-Cookie` → 带 Cookie `POST /auth/refresh` 得裸 token →
   登出后刷新 401 → 管理端强制下线后对端请求 401 → 禁用用户后刷新 401
4. 前端：`pnpm dev:ele` 登录 → 停置 2h（或临时调小 ttl）观察 401 后静默续期不断线

## 8. 轮换升级路径（v2 预留）

加 `prev_refresh_token_hash` + `rotated_at` 两列：刷新时 当前hash命中 → 轮换
（旧值入 prev）；prev 命中且距轮换 ≤60s → 幂等重试并**回写当前 Cookie**（多标签页
收敛）。此设计同时获得重放检测与多标签页安全，v1 表结构无需预改（新迁移追加列即可）。
