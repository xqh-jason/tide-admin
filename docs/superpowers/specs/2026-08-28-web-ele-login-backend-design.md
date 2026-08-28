# 设计文档：web-ele 登录功能对接 Salvo 后端

> 日期：2026-08-28
> 范围：仅前端 `apps/web-ele` 登录链路对接后端；后端 Rust 代码由用户手写，本设计只做契约梳理与前端适配。

## 1. 背景与目标

后端 `salvo-vben-admin` 已按学习计划 W2/W3 完成登录闭环与权限契约端点，前端为本仓库的 `web-ele` 子应用（Element Plus）。当前 web-ele 仍是 vben 官方模板的 mock 风格（`successCode: 0`、`GET` 请求、mock 账号选择器），与后端契约不一致。本次目标：**打通前端登录 → 用户信息 → 权限码 → 菜单树 的完整链路**，使 web-ele 直接对接真实后端。

后端 Rust 代码由用户手写（学习计划最高原则），本次交付仅为前端适配，后端如无需改动则不改动；若发现契约缺口，仅给建议由用户实现。

## 2. 后端契约（已确认，只读）

统一契约：所有请求一律 `POST + JSON body`；响应体 `{ code: 200, data, message }`，`code=200` 为成功；401 表示 token 失效/未认证。

| 功能 | 端点 | 入参 | 出参 |
|---|---|---|---|
| 登录 | `POST /api/v1/auth/login` | `{username, password}` | `{ token }` |
| 登出 | `POST /api/v1/auth/logout` | Bearer token | 空 |
| 用户信息 | `POST /api/v1/user/info` | 空 body | `{ userInfo: {id, username, nickname, email, status}, roles: string[] }` |
| 权限码 | `POST /api/v1/user/access-codes` | 空 body | `string[]` |
| 菜单树 | `POST /api/v1/user/menus` | 空 body | vben `VbenMenuItem[]` 树 |

## 3. 前端改动点

### 3.1 请求层契约适配（必改，文档 §3.3 硬性要求）

**文件**：`apps/web-ele/src/api/request.ts`

- `defaultResponseInterceptor` 的 `successCode: 0` → `successCode: 200`（后端 `code=200` 才视为成功）。
- 错误提取：当前 `errorMessageResponseInterceptor` 从 `error`/`message` 字段取错误文案，后端失败响应为 `{code, data, message}`，保留 `message` 提取逻辑即可（微调注释）。
- `refreshTokenApi` 保留但**不启用**（`preferences.app.enableRefreshToken` 默认 `false`，后端暂无 `/auth/refresh`）。

### 3.2 API 端点对齐（全部改 POST + JSON body）

**文件**：`apps/web-ele/src/api/core/auth.ts`

- `loginApi`：`requestClient.post('/auth/login', data)` 不变；后端响应 `{ token }`，vben `authLogin` 期望 `{ accessToken }`，在 `loginApi` 返回前做适配：`const { token } = await requestClient.post(...)` 后返回 `{ accessToken: token }`（保持 `LoginResult` 类型为 `{ accessToken }` 不变，不触发 store 层改动）。
- `getAccessCodesApi`：`requestClient.get('/auth/codes')` → `requestClient.post('/user/access-codes')`。
- `logoutApi`：`requestClient.post('/auth/logout')` 不变（去掉 `withCredentials`，后端 Bearer 认证）。

**文件**：`apps/web-ele/src/api/core/menu.ts`

- `getAllMenusApi`：`requestClient.get('/menu/all')` → `requestClient.post('/user/menus')`。

**文件**：`apps/web-ele/src/api/core/user.ts`

- `getUserInfoApi`：`requestClient.get('/user/info')` → `requestClient.post('/user/info')`。
- **字段映射适配层**：后端返回嵌套 `{ userInfo, roles }`，vben `UserInfo` 需要扁平结构。做转换：
  - `id` → `userId`（String）
  - `nickname` → `realName`
  - `roles` → 取顶层 `roles`
  - `avatar`、`homePath` → 用默认值（`preferences.app.defaultAvatar` / `defaultHomePath`，或后端字段可映射 `email` 等）

### 3.3 权限模式与登录页

**文件**：`apps/web-ele/src/preferences.ts`

- `app.accessMode: 'backend'`（文档 §3.1 硬性要求，菜单/权限码全部由后端返回）。

**文件**：`apps/web-ele/src/views/_core/authentication/login.vue`

- 移除 mock 账号选择器（`selectAccount` + `MOCK_USER_OPTIONS`）与滑块验证码（`SliderCaptcha`）。
- 仅保留用户名 + 密码两个字段，提交给 `authStore.authLogin`。

## 4. 后端建议（用户手写，仅建议）

- 当前 4 个契约端点已满足前端登录闭环，**后端无需改动**。
- 若后续要实现 W5 图形验证码，再与登录页滑块对接（本次不做）。

## 5. 验证

- `pnpm dev:ele` 启动，用后端 seed 的 admin 账号登录，验证：登录成功 → 跳转首页 → 菜单/权限码正确渲染。
- `pnpm check:type` 类型检查通过。
- `pnpm run test:unit` 单元测试不回归。