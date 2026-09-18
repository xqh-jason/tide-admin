# AGENTS.md

This file provides guidance to Agents when working with code in this repository.

## 项目概述

Vue Vben Admin 5.x monorepo（pnpm + turbo），作为 Rust Salvo 后端（[tide-server](https://github.com/xqh-jason/tide-server)，独立仓库）的管理前端。唯一应用是 `apps/web-ele`（Vue 3 + Element Plus + Tailwind CSS v4）。后端不再使用 vben 自带的 nitro mock，全部对接真实 Salvo 后端。

## 常用命令

```bash
pnpm install                # 安装依赖（强制 pnpm，Node ^22.18 || ^24.12）
pnpm dev:ele                # 启动 web-ele 开发服务器（端口 5910）
pnpm build:ele              # 构建 web-ele
pnpm check:type             # 全 workspace 类型检查（turbo run typecheck，vue-tsc）
pnpm lint                   # oxlint + eslint + stylelint（经 vsh 聚合）
pnpm format                 # 自动修复格式
pnpm test:unit              # vitest run --dom（happy-dom 环境）
npx vitest run --dom path/to/test.ts   # 运行单个测试文件
pnpm check:circular         # 循环依赖检查
```

- 提交信息遵循 Conventional Commits（feat/fix/refactor 等），commitlint 在 commit-msg 阶段强制校验。
- lefthook pre-commit 会对暂存文件跑 oxlint/oxfmt/eslint/stylelint --fix 并执行 `pnpm check:type`。

## 后端接口契约（重要）

定义于 `apps/web-ele/src/api/request.ts`，改接口层前先读它：

- baseURL 为 `/api/v1`（`VITE_GLOB_API_URL`），dev 下 vite proxy 转发到 `http://127.0.0.1:8080`（Salvo 后端）。
- 业务接口全 POST + JSON body；请求头统一注入 Bearer token 与 Accept-Language。
- 响应包装 `{ code, data, message }`，`code=1` 成功 / `0` 失败，HTTP 恒 200（仅认证失败 401）。vben 默认 successCode 为 0，此处已改为 1，勿改回。
- 后端已提供 `/auth/refresh`（refresh token 走 HttpOnly Cookie），`enableRefreshToken` 已开启（见 `apps/web-ele/src/preferences.ts`）；401 时先静默刷新，失败才走重新认证。

## 架构

### Monorepo 分层

- `apps/web-ele` — 唯一应用，`#/*` import 别名映射到 `apps/web-ele/src/*`。
- `packages/@core` — 与 UI 库无关的框架基础（composition、ui-kit、composables 等）。
- `packages/effects/*` — 可复用业务能力：`access`（权限/动态路由）、`request`（axios 封装）、`common-ui`、`layouts`、`hooks`、`plugins`（vxe-table 等适配）。
- `packages/{stores,types,constants,locales,preferences,icons,styles,utils}` — 跨应用共享层。
- `internal/*` — 工程配置包（vite-config、tsconfig、lint-configs、tailwind-config、node-utils）。
- `scripts/vsh`、`scripts/turbo-run` — 内置 CLI（lint 聚合、交互式 dev 选择）。
- 依赖版本统一走 `pnpm-workspace.yaml` 的 catalog，workspace 内引用用 `workspace:*`。

### 动态路由与权限（backend 模式）

`apps/web-ele/src/router/access.ts` 是关键：

- `accessMode: backend` — 登录后调 `getAllMenusApi` 拉取后端菜单树，经 `generateAccessible` 生成路由。
- 后端菜单 `component` 形如 `#/views/system/user/index.vue`，须经 `normalizeComponent` 归一为 `/system/user/index` 才能命中 `import.meta.glob('../views/**/*.vue')` 的 pageMap，否则落到 404。新增页面须保证路径可被归一化匹配。
- dashboard 等前端自有路由不走后端菜单，由 `registerFrontendRoutes` 挂到根路由（BasicLayout）children 下，并与后端菜单合并后按 `order` 排序。

### 应用内约定（apps/web-ele/src）

- `api/system/*.ts` — 每个资源一个文件，用 `export namespace XxxApi` 收敛接口类型（继承 `AuditFields`/`PageParams`/`PageResult` 等公共类型，见 `api/system/types.ts`）与 API 函数；后端字段的序列化细节（serde default、软删、全量替换语义）写在接口的 JSDoc 注释里，改前后端契约时同步更新。
- `views/system/*` — 管理页统一结构：`index.vue`（页面 + vxe-table）+ `data.ts`（列/搜索/表单 schema）+ `modules/form.vue`（新建/编辑抽屉）；审计列与搜索复用 `audit-columns.ts`、`audit-search.ts`。
- `adapter/` — 将 vben 的 form/vxe-table 适配到 Element Plus 组件（`form.ts`、`vxe-table.ts`、`component/`），页面不直接注册适配器。
- `store/` — 应用级 Pinia store（auth、dict 字典缓存）。

### 写操作防连点（约定）

由 UI 触发的写操作必须复用既有统一机制，不得在页面另起一套：

- **表单/弹窗提交** — 走 `useVbenDrawer`/`useVbenModal` 的 `onConfirm`，保留 `lock()/unlock()`，且 handler 内必须 `await` 提交请求。`DrawerApi`/`ModalApi` 已内置重入锁（`packages/@core/ui-kit/popup-ui` 的 `*-api.ts`），重复确认会被忽略。
- **列表行内操作** — 走 `CellOperation` 渲染器（`adapter/vxe-table.ts`，内置行级操作锁）或 `VbenTableAction`（`action-item.vue`，确认按钮内置提交态）；页面的 `onActionClick` 必须为 `async` 且 `await` 写操作，否则锁覆盖不到请求。
- **工具栏按钮**（批量删除等）— 页面自持提交态 `ref`，绑 `:loading` 并做重入判断。
- 查询类接口（list/detail/导出）不加防连点。
- 不要在 `api/request.ts` 做通用请求去重（相同 body 的并发可能是合法的重试/批量）。

## 其他

- 仓库根有 graphify 知识图谱（`graphify-out/`）；代码库结构性问题优先 `graphify query "<question>"`，改代码后 `graphify update .`。
- `docs/` 已移除：上游 vben 官方文档站（含其商业服务与联系方式）不再入库。
