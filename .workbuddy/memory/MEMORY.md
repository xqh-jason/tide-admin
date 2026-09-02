# 项目长期记忆：salvo-vben-web（前端） × salvo-vben-admin（后端）

## ⛔ 最高优先级：只改前端
- 本工作区只允许修改 `salvo-vben-web/` 内的文件
- 后端 `salvo-vben-admin` **只读**：可读、可分析、可给方案，**禁止写入/编辑**
- 需要改后端时，输出完整方案或代码片段交给用户手写执行（用户另有明确逐次授权除外）
- 此规则同时已写入 `~/.workbuddy/MEMORY.md`（用户级）

## 双仓协作
- 前端：`/Users/xuqinghui/code/rust/salvo-vben-web`（vue-vben-admin v5 monorepo，子应用 `apps/web-ele`，Element Plus）
- 后端：`/Users/xuqinghui/code/rust/salvo-vben-admin`（Rust + Salvo 0.95 + SeaORM 1.1 + MySQL 8）
- 前端 dev 端口 5910，`vite.config.ts` 代理 `/api` → `http://127.0.0.1:8080`；`.env` 中 `VITE_GLOB_API_URL=/api/v1`

## 统一契约（最高准则，勿改）
- 所有请求 **POST + JSON body**，分页/过滤参数平铺在 body 顶层（不用 query），无参传 `{}`
- 响应体 `{ code, data, message }`：**code=1 成功 / code=0 失败**；HTTP 一律 200，仅鉴权失败 401
- 前端 `apps/web-ele/src/api/request.ts` 已配 `successCode: 1`（注意：docs 里旧文档写的是 200，已过时）
- 分页：请求 `{ page (1-based), page_size (缺省10/上限100) }`，响应 `{ items, total, total_pages }`

## 已实现的后端端点（`POST /api/v1/...`）
- auth: `login` / `logout`（logout 需 Bearer，前端用 baseRequestClient 手动带）
- user: `list` / `info` / `access-codes` / `menus` / `create` / `get` / `update` / `update-status`
- role / menu / sys-api / dict：`{list, create, update, get, delete}` 五端点
- 权限码：`system:{user,role,menu,api}:{create,update,delete}`

## 关键约定
- 权限：`accessMode: 'backend'`，菜单树与权限码全部后端返回；super 角色在 service 层短路放行，且基于 DB 实时角色（不信任 JWT 快照）
- 菜单 `component` 后端存 `#/views/system/xxx/index.vue`，前端 `router/access.ts` 的 `normalizeComponent` 剥 `#/views` 前缀命中 `import.meta.glob('../views/**/*.vue')`
- 前端页面模式：`views/system/<x>/index.vue`（useVbenVxeGrid + proxyConfig.ajax.query）+ `data.ts`（columns/formSchema）+ `modules/form.vue`
- 后端域四件套：api/service/repo/dto，端点顺序 list → create → update → get → delete
- 软删除：主表软删（`deleted_at IS NULL` 过滤），关系表硬删
- 后端 W4 起有代码生成器 `codegen/`（域定义 JSON → 6 个文件），dict 域即生成产物

## 分工
- 用户手写 Rust 业务代码，AI 写测试 + review（见后端 AGENTS.md）
- 前端由 AI/用户按契约对接

## 已知缺口（2026-09-02 记录）
1. 后端 `src/infra/seed.rs` 只有 System/SystemUser/SystemRole/SystemMenu/SystemApi 五个菜单分支，**缺 dict 菜单与 `system:dict:*` 权限码**，前端 `/system/dict/index` 页面已存在但菜单里看不到
2. 后端权限常量仅 `SYSTEM_USER_CREATE` / `SYSTEM_USER_UPDATE`；role/menu/api/dict 的写操作尚未做后端 `has_permission` 校验
3. 后端有未提交改动：新增 `src/utils/request.rs`（字段级参数错误提示版 JsonBody）+ 各域 api.rs 切换 + catcher 调整
