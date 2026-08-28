# 接口契约参考：web-ele 系统管理（用户/角色/菜单）

> 日期：2026-08-28
> 范围：前端 `apps/web-ele` 系统管理域已完成接口与类型预写（`src/api/system/`），本文档供后端 `salvo-vben-admin` 实现缺失端点时参考。
> 最高准则：后端 Rust 代码由用户手写，本文档仅是前端消费视角的契约建议，后端可按既有风格调整；字段名以本文档为准可保证前端零改动对接。

## 1. 统一约定（已实现，回顾）

- 所有请求一律 **POST + JSON body**，分页/过滤参数平铺在 body 顶层，无 query 参数；无入参接口传 `{}`。
- 响应包裹 `{ code: 200, data, message }`；业务错误 HTTP 400，内部错误 HTTP 500，未认证 HTTP 401。
- 分页：请求 `{ page?: number, page_size?: number }`（page 从 1 开始，page_size 缺省 10、上限 100）；响应 `{ total: number, total_pages: number, items: T[] }`。
- 字段名一律 snake_case；现有全库仅 `userInfo` / `keepAlive` / `hideInMenu` 三处显式 camelCase rename（vben 消费字段）。
- 认证 `Authorization: Bearer <token>`；权限校验在 service 层用 `sys_menu.permission` 权限码显式判断，super 角色短路放行。

## 2. 前端已完成的部分

| 模块 | 内容 |
|---|---|
| 登录链路 | `auth/login`、`auth/logout`（手动带 Bearer）、`user/info`（嵌套→扁平映射）、`user/access-codes`、`user/menus` 全部已对接 |
| 管理页面 | `views/system/user|role|menu/`：搜索表单、列表（vxe-table 树表/分页）、增删改抽屉、状态开关、角色分配、菜单授权树 |
| 接口与类型 | `src/api/system/{types,user,role,menu}.ts`，类型即本文档各表的 TypeScript 表达 |

**已消费且后端已实现的端点**（无需改动）：`/auth/login`、`/auth/logout`、`/user/list`、`/user/info`、`/user/access-codes`、`/user/create`、`/user/menus`。

## 3. 待实现端点契约（前端已预写，按此实现即可对接）

### 3.1 用户域补充

| 端点 | 请求 body | 响应 data | 权限码建议 |
|---|---|---|---|
| `POST /api/v1/user/get` | `{ id: number }` | `UserDetail`（见下） | 登录即可 |
| `POST /api/v1/user/update` | `{ id: number, nickname?, password?, phone?, email?, avatar?, status?, role_ids? }` | `UserResp` | `system:user:update` |
| `POST /api/v1/user/delete` | `{ id: number }` | `null` | `system:user:delete` |

- `UserDetail` = `UserResp` 扩展：`{ id, username, nickname, email, status, phone, avatar, role_ids: number[], created_at, updated_at }`。**`role_ids` 是编辑回显角色分配的关键字段**（来自 `sys_user_role`）。
- update 语义：除 `id` 外全部 `Option`，**None = 不修改**；`role_ids` 传数组即全量替换 `sys_user_role`（事务）；`password` 仅在传非空时重置（前端编辑留空不传该字段）。
- update/delete 建议约束：禁止禁用/删除当前登录人与 `admin` 账号；delete 为软删除（`deleted_at`）并在事务内物理清理 `sys_user_role`。
- **`UserResp` 扩展建议**：`/user/list` 现返回 `{ id, username, nickname, email, status }`，前端列表已渲染 `phone`、`created_at` 列，建议 UserResp 增加 `phone`、`created_at`、`updated_at`（不返回 password/avatar 亦可，avatar 可选）。时间格式为 chrono `NaiveDateTime` 默认序列化 `"YYYY-MM-DDTHH:mm:ss"`。

### 3.2 角色域（对齐 `docs/superpowers/plans/2026-08-28-w3-role-crud.md`，补充两点）

| 端点 | 请求 body | 响应 data | 权限码建议 |
|---|---|---|---|
| `POST /api/v1/role/list` | `{ page?, page_size?, keyword?, status? }` | `PageResult<RoleResp>` | 登录即可 |
| `POST /api/v1/role/get` | `{ id: number }` | `RoleResp`（**含 `menu_ids`**） | 登录即可 |
| `POST /api/v1/role/create` | `{ role_name, role_key, sort?, status?, remark?, menu_ids? }` | `RoleResp` | `system:role:create` |
| `POST /api/v1/role/update` | `{ id, role_name?, role_key?, sort?, status?, remark?, menu_ids? }` | `RoleResp` | `system:role:update` |
| `POST /api/v1/role/delete` | `{ id: number }` | `null` | `system:role:delete` |

- `RoleResp` 建议：`{ id, role_name, role_key, sort, status, remark, created_at?, updated_at?, menu_ids? }`，`menu_ids` 仅 `/role/get` 返回（编辑回显授权树用，来自 `sys_role_menu`）。
- 与计划契约的两点补充：① `get` 响应带 `menu_ids`；② **`role_key = "super"` 的行，update/delete 应拒绝**（前端已对 super 行隐藏编辑/删除按钮）。
- `menu_ids` 语义（计划原文）：update 中 `Some(vec)` = 全量替换 `sys_role_menu`、`None` = 不动；前端授权树提交的是 **勾选 + 半选（父目录）id 的并集**，即最终 `sys_role_menu` 存完整链路 id，权限码查询链无需递归。

### 3.3 菜单域管理（全新，W3 待办"菜单管理 CRUD"）

| 端点 | 请求 body | 响应 data | 权限码建议 |
|---|---|---|---|
| `POST /api/v1/menu/list` | `{ keyword?, status? }` | `SystemMenu[]` 平铺数组 | 登录即可 |
| `POST /api/v1/menu/create` | `MenuParams`（见下） | `SystemMenu` | `system:menu:create` |
| `POST /api/v1/menu/update` | `{ id, ...MenuParams 字段全部可选 }` | `SystemMenu` | `system:menu:update` |
| `POST /api/v1/menu/delete` | `{ id: number }` | `null` | `system:menu:delete` |

- `SystemMenu` 对齐 `sys_menu` 全字段（snake_case）：`{ id, parent_id, path, name, component, title, icon, sort, keep_alive, hidden, menu_type, permission, status, created_at?, updated_at? }`。
- `menu/list` 返回**平铺列表且必须包含 `menu_type = 3` 的按钮行**（前端自己组树、授权树也要按钮节点），按 `sort`、`id` 升序；`keyword` 建议 LIKE 匹配 `title`/`name`/`path`。注意与 `/user/menus` 区分：后者是 vben 菜单树且排除按钮。
- 校验建议：`menu_type` ∈ {1,2,3}；类型 1/2 必填 `path`+`name` 且 `name` 全局唯一（Vue Router 约束，避坑第 12 条）、顶级 `path` 以 `/` 开头；类型 2 必填 `component`；类型 3 必填 `permission`；`parent_id` 必须存在且未软删；update 时 `parent_id` 变更需防自环/子环。
- delete：存在子节点时返回业务错误（HTTP 400，message 提示"存在子菜单"）；软删本行并在事务内物理清理 `sys_role_menu` 中的关联。

## 4. 权限码清单（写入 sys_menu 按钮行的 permission 字段）

| 权限码 | 用途 | 前端挂载点 |
|---|---|---|
| `system:user:create` | 创建用户（后端常量已有） | 用户页"新增"按钮 |
| `system:user:update` | 修改用户/状态开关 | 用户页编辑/状态开关 |
| `system:user:delete` | 删除用户 | 用户页删除 |
| `system:role:create` / `update` / `delete` | 角色增删改 | 角色页 |
| `system:menu:create` / `update` / `delete` | 菜单增删改 | 菜单页 |

前端说明：`v-access:code` 与表格操作按钮按 `user/access-codes` 返回的数组判断显隐；**access-codes 返回 `["super"]` 时前端视为通配码全放行**（已在 `useAccess().hasAccessByCodes` 实现，对齐后端 super 短路语义）。`CellOperation` 渲染的操作列不做前端隐藏，无权限时点击由后端 400 拦截提示。

## 5. 菜单 component 字符串约定（重要纠正）

学习计划 §3.4 写的 `#/views/<相对路径>.vue` **实际命中不了**。前端路由转换逻辑（`packages/utils/src/helpers/generate-routes-backend.ts` 的 `normalizeViewPath`）：去 `./`/`../` 前缀 → 补 `/` 开头 → 剥离开头 `/views` → 补 `.vue` 后到 `import.meta.glob('../views/**/*.vue')` 里查。

**正确写法**（与 `apps/web-ele/src/views/` 下的文件一一对应）：

| 菜单类型 | component 值 | 命中的文件 |
|---|---|---|
| 目录（menu_type=1） | `BasicLayout`（或留空，有 children 时自动套布局） | 布局组件 |
| 页面（menu_type=2） | `/system/user/index` | `apps/web-ele/src/views/system/user/index.vue` |
| 按钮（menu_type=3） | 留空（不进菜单树） | — |

本次已创建的页面组件：`/system/user/index`、`/system/role/index`、`/system/menu/index`。`name` 必须全局唯一；`meta` 映射：`title`←`title`、`icon`←`icon`（iconify 名）、`order`←`sort`、`keepAlive`←`keep_alive`、`hideInMenu`←`hidden`。

## 6. sys_menu 种子数据（可直接执行，登录后菜单立即可用）

```sql
-- 系统管理目录
INSERT INTO sys_menu (parent_id, path, name, component, title, icon, sort, keep_alive, hidden, menu_type, permission, status)
VALUES (0, '/system', 'System', 'BasicLayout', '系统管理', 'lucide:settings', 10, 0, 0, 1, '', 1);
SET @system = LAST_INSERT_ID();

-- 三个页面
INSERT INTO sys_menu (parent_id, path, name, component, title, icon, sort, keep_alive, hidden, menu_type, permission, status)
VALUES (@system, 'user', 'SystemUser', '/system/user/index', '用户管理', 'lucide:user-round', 1, 0, 0, 2, '', 1);
SET @user = LAST_INSERT_ID();
INSERT INTO sys_menu (parent_id, path, name, component, title, icon, sort, keep_alive, hidden, menu_type, permission, status)
VALUES (@system, 'role', 'SystemRole', '/system/role/index', '角色管理', 'lucide:key-round', 2, 0, 0, 2, '', 1);
SET @role = LAST_INSERT_ID();
INSERT INTO sys_menu (parent_id, path, name, component, title, icon, sort, keep_alive, hidden, menu_type, permission, status)
VALUES (@system, 'menu', 'SystemMenu', '/system/menu/index', '菜单管理', 'lucide:menu', 3, 0, 0, 2, '', 1);
SET @menu = LAST_INSERT_ID();

-- 按钮权限码（menu_type=3，仅 permission 参与 access-codes 查询）
INSERT INTO sys_menu (parent_id, path, name, component, title, icon, sort, keep_alive, hidden, menu_type, permission, status)
VALUES
  (@user, '', '', '', '用户创建', '', 1, 0, 0, 3, 'system:user:create', 1),
  (@user, '', '', '', '用户修改', '', 2, 0, 0, 3, 'system:user:update', 1),
  (@user, '', '', '', '用户删除', '', 3, 0, 0, 3, 'system:user:delete', 1),
  (@role, '', '', '', '角色创建', '', 1, 0, 0, 3, 'system:role:create', 1),
  (@role, '', '', '', '角色修改', '', 2, 0, 0, 3, 'system:role:update', 1),
  (@role, '', '', '', '角色删除', '', 3, 0, 0, 3, 'system:role:delete', 1),
  (@menu, '', '', '', '菜单创建', '', 1, 0, 0, 3, 'system:menu:create', 1),
  (@menu, '', '', '', '菜单修改', '', 2, 0, 0, 3, 'system:menu:update', 1),
  (@menu, '', '', '', '菜单删除', '', 3, 0, 0, 3, 'system:menu:delete', 1);

-- 如需给普通角色授权（super 短路无需授权）：
-- INSERT INTO sys_role_menu (role_id, menu_id) VALUES (<role_id>, <menu_id>), ...;
```

## 7. 前端降级行为说明

- 待实现端点未就绪时：列表/详情请求报错仅弹 ElMessage 提示，不影响登录链路与其他已就绪功能；角色编辑、用户编辑回显会在拉取详情失败时静默回退到行数据。
- 分页取数走 `items`/`total`（adapter 已按此配置）；`menu/list` 无分页，前端包一层 `{ items, total }` 兼容。
- 时间列直接渲染后端字符串，不做时区换算。
