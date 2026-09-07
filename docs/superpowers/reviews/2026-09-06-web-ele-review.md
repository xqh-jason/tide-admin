# web-ele 前端代码 Review 报告

- 日期：2026-09-06
- 范围：`apps/web-ele/src`（api 层 / views/system / adapter / store / router / 登录链路）
- 契约事实源：`salvo-vben-admin` 后端 `src/infra/router.rs`、`src/modules/*/dto.rs`、`src/utils/{response,page,id_req}.rs`、`src/infra/seed.rs`（后端项目只读，未做任何修改）
- 结论：端点路径、请求方法、统一响应包装、分页结构、认证链路、权限码使用均已对齐；发现前端侧问题 4 个（已全部修复），需后端修改的问题统一列于第 4 节。

---

## 1. 已对齐清单（✅ 无需改动）

| 对齐点 | 前端 | 后端 |
|---|---|---|
| 统一响应包装 | `request.ts` `successCode: 1` | `ApiResponse { code: 1 成功 / 0 失败 }`，HTTP 恒 200 |
| 分页请求 | `PageParams { page, pageSize }` | `PageQuery`（serde flatten 平铺 body 顶层） |
| 分页响应 | `PageResult { items, total, totalPages }` + vxe proxyConfig `result: 'items'` | `PageResult<T>` |
| 请求方法 | 业务接口全 POST + JSON body | 全部 `.post(handler)` |
| 端点路径 | `user/role/menu/dictionary/dictionary-detail/sys-api/*-log` 各函数 | `router.rs` + 各域 `mod.rs` 一一对应 |
| 按 id 操作 | `{ id } satisfies IdRequest` | `IdReq` |
| 登录 | `{ username, password, captchaId, captchaValue }`，`{token}`→`{accessToken}` 适配 | `LoginReq` / `LoginResp` |
| 验证码 | 裸 base64 拼 `data:image/png;base64,` 前缀；正则 `^\d{4}$`；失败/点击图刷新并清空输入 | `CHARS = 4` 纯数字；一次性消费，失败必须换新 id |
| 用户信息 | `/user/info` 嵌套 `{ userInfo, roles }` 字段映射 | `UserInfoResp`（`#[serde(rename = "userInfo")]`） |
| 权限码 | `v-access:code` / `VbenTableAction.auth` / `CellOperation.auth` | `seed.rs` 15 个按钮码（`system:user:create` 等）完全一致 |
| 动态菜单 | `accessMode: 'backend'`；`#/views/x.vue` 归一化命中 pageMap | `VbenMenuItem` |
| 审计字段 | 列展示 `createdByName/updatedByName`；筛选 `createdBy/updatedBy` + `createdAtBegin/End`（fieldMappingTime） | `UserListReq` 等各 ListReq |
| 日志类页面 | 正确省略审计列/审计筛选（只追加记录） | 后端两类日志 ListReq 无审计参数 |
| 字典 | `get-by-type` 下拉契约；字符串值转数字匹配 i8 状态字段 | `DictionaryOptionResp` |
| 日志筛选 | login-log `username/ip/status`；operation-log `userId/status/keyword` | 各自 ListReq，完全一致 |
| 401 处理 | `authenticateResponseInterceptor` 触发重新认证 | 仅认证失败返回 HTTP 401 |
| 错误提示 | 从 `response.data.message` 提取 | 业务错误 message 为中文文案 |

## 2. 前端问题（本次已修复 🔧）

1. **`getMenuList` 传 `pageSize: 10_000` 被后端 clamp**：review 时后端 `PageQuery` 上限为 `clamp(1, 100)`，菜单超过 100 条时树表/授权树/父菜单下拉会静默截断。前端曾改为循环分页拉全量；**后端现已把上限放宽为 `clamp(1, 1000)`**，前端已恢复单次拉取（`pageSize: 1000`）。注意：菜单数量超过 1000 条时仍会截断，届时建议后端提供专门的树接口。
2. **`UserBrief.deleted` 类型错误**：后端是 `bool`（序列化为 `true/false`），前端标注 `CommonStatus`（0/1）并在 `audit-search.ts` 用 `user.deleted === 1` 判断，导致软删用户永远不被置灰。
   → 修复：类型改 `boolean`，判断改 truthy。
3. **role/menu/api 操作列（CellOperation 渲染器）无权限码控制**：与 user/dictionary（`VbenTableAction` 带 `auth`）不一致，有页面访问权但无按钮权限码的用户仍能看到编辑/删除按钮（点击后被后端拒绝）。
   → 修复：`adapter/vxe-table.ts` 的 `CellOperation` 渲染器支持 per-action `auth`（`useAccess().hasAccessByCodes` 过滤）；`CellSwitch` 支持 `attrs.auth`（无权限时开关禁用）；role/menu/api/user 的 `data.ts` 补齐对应权限码（`append` 归 `system:menu:create`）。
4. **菜单创建按钮类型（menuType=3）时 `path`/`name` 拿不到值**：后端 `CreateMenuReq.path/name` 为必填 `String`（无 default），创建按钮节点会报「请求参数格式错误：缺少必填字段 path」。
   → 修复：`menu/modules/form.vue` 创建分支与更新分支一致做 13 字段空值兜底。

## 3. 前端缓解措施（后端缺口无法单方面根治）

- **角色编辑授权回显缺失**：`/role/get` 不返回 `menuIds`，编辑抽屉无法回显已授权菜单；保存按后端「全量替换」语义提交（不勾选即清空）。已在表单授权树上方加 `ElAlert` 警示，并修正 `SystemRole.menuIds` 注释。
- **API 编辑授权回显缺失**：`/sys-api/get` 不返回 `roleIds`，同上加了 `ElAlert` 警示。
- **用户编辑角色回显缺失**：`/user/get` 不返回 `roleIds`，角色选择器为空；因后端 user 域 repo 对空 `role_ids` 是「跳过不清空」语义，不会造成数据丢失，仅修正注释说明。

## 4. 需要后端修改的事项（统一清单 ⚠️）

### P0 —— 造成数据丢失，建议尽快处理

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| 1 | `RoleResp` 不含 `menu_ids`，`/role/get` 无法回显角色已授权菜单 | 前端角色编辑回显永远为空；叠加 update「全量替换」语义，**直接保存会清空该角色全部菜单授权**（`role/repo.rs update_role_with_links` 先无条件删旧关联再插入） | `RoleResp` 增加 `menu_ids` 字段，`/role/get`（必要时 list 也）回传 |
| 2 | `ApiResp` 不含 `role_ids`，`/sys-api/get` 无法回显授权角色 | API 编辑保存会按全量替换语义**清空该接口的角色授权**（`sys_role_api`） | `ApiResp` 增加 `role_ids` 字段并回传 |
| 3 | `UserResp` 不含 `phone`，但 `CreateUserReq/UpdateUserReq` 都有必填 `phone` | 列表 phone 列恒空；编辑回显为空；**编辑保存会把库中 phone 覆盖为空串** | `UserResp` 增加 `phone` 字段 |

### P1 —— 功能完整性

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| 4 | `UserResp` 不含 `role_ids`（`/user/get`） | 用户编辑时角色选择器无法回显（前端已确认后端空数组=跳过，不清空数据） | `/user/get` 响应附带 `role_ids` |
| 5 | 无 refresh token 机制，`/auth/refresh` 不存在 | 前端 `refreshTokenApi` 为死代码（`enableRefreshToken` 默认 false 未触发）；token 过期只能重新登录（JWT 7 天） | **按产品决策暂缓**；若实现需配套 `/auth/refresh` 端点，前端已预留调用点 |

### P2 —— 契约易用性（可选）

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| 6 | `menuType=2` 语义：后端注释为「外链」，前端文案与表单把它当「菜单（页面组件 component 必填）」 | 两端对同一类型的理解不一致，外链场景（component 存 URL）未设计 | 明确契约语义：若 2=外链，前端改文案与校验；若 2=页面菜单，后端更新 DTO 注释 |
| 7 | `CreateMenuReq.path/name` 必填但按钮类型（menuType=3）语义上为空 | 前端已空串兜底适配，但契约语义别扭 | 二者加 `#[serde(default)]`，与「按钮 path/name 可空」语义一致 |
| 8 | 更新接口（role/menu/api/user）全字段必填、无 `#[serde(default)]` | 前端必须全量提交并做大量空值兜底（已适配）；局部更新只能靠独立端点 | 可为非敏感字段加 `#[serde(default)]`，或维持现状（前端已适配） |
| 9 | 接口授权 fail-open：未登记进 `sys_api` 的接口放行 | 新增接口若忘记登记则绕过接口级授权 | 视安全要求决定是否改为 fail-closed，或提供批量登记工具 |

## 5. 备注

- 本次 review 同步为全部业务相关代码补充了中文注释（见 git 变更），注释不改变逻辑。
- 分页上限：后端已由 `clamp(1, 100)` 放宽为 `clamp(1, 1000)`，前端菜单全量拉取按 1000 适配；user/role 表单内的角色下拉仍传 `pageSize: 100`（下拉组件场景，角色超过 100 时建议分批搜索或后端提供全量端点）。
- 权限码对照：前端使用 `system:user:create/update/delete`、`system:role:*`、`system:menu:*`、`system:api:*`、`system:dictionary:*`、`system:dictionary-detail:*`、`system:login-log:delete`、`system:operation-log:delete`，与 `seed.rs` 种子完全一致，无多余、无遗漏。
- 后端 `AGENTS.md` 开头写的「响应体 code: 200」已过时，实际成功码为 `1`（`src/utils/response.rs`），以代码为准。
