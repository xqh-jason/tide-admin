<div align="center">

# tide-admin

基于 [Vue Vben Admin 5.x](https://github.com/vbenjs/vue-vben-admin) 的中后台管理前端，
对接 Rust Salvo 后端 [tide-server](https://github.com/xqh-jason/tide-server)

[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%5E22.18%20%7C%7C%20%5E24.12-blue.svg)](./package.json)
[![pnpm](https://img.shields.io/badge/pnpm-11-orange.svg)](./package.json)

</div>

## ✨ 简介

tide-admin 是一套 RBAC 中后台管理系统的前端实现，采用 pnpm monorepo 组织，
唯一应用为 `apps/web-ele`（Vue 3 + Element Plus + Tailwind CSS v4）。
后端为独立仓库 [tide-server](https://github.com/xqh-jason/tide-server)
（Rust · Salvo · SeaORM · MySQL），前后端通过统一的 POST + JSON 契约通信。

## ✨ 功能特性

- **认证与会话**：账号密码 + 图形验证码登录；双凭证静默刷新（401 先凭 HttpOnly
  Cookie 调 `/auth/refresh` 续期，失败才重新认证）；登录过期弹窗/整页两种处理模式
- **动态路由与权限**：后端菜单模式生成路由，按钮级权限码前端显隐 + 后端接口拦截双保险
- **系统管理**：用户（多部门挂载 / 主部门 / 负责人）、部门（树表）、角色（菜单 + API 授权）、
  菜单、API、数据字典（类型 + 字典项）、会话管理（在线/离线/已下线/已过期四态，
  强制下线与历史清理）
- **任务与日志**：定时任务（执行日志、立即执行）、操作日志、登录日志
- **通用能力**：审计字段（创建人 / 更新人 / 时间）统一列与搜索、危险操作二次确认、
  zh-CN / en-US 国际化、多主题
- **工程化**：pnpm workspace + Turbo 任务编排，oxlint / eslint / stylelint / lefthook 全链路规范

## 🧱 技术栈

| 分类     | 选型                                            |
| -------- | ----------------------------------------------- |
| 框架     | Vue 3（`<script setup>` + TypeScript）          |
| 构建     | Vite · pnpm workspace · Turbo                   |
| UI       | Element Plus · Tailwind CSS v4 · vxe-table      |
| 状态路由 | Pinia · Vue Router（后端菜单动态路由）          |
| 质量保障 | oxlint · eslint · stylelint · vitest · lefthook |

## 🚀 快速开始

环境要求：Node `^22.18 || ^24.12`，pnpm（版本由 `packageManager` 字段钉住，`corepack enable` 即可）。

```bash
git clone https://github.com/xqh-jason/tide-admin.git
cd tide-admin
pnpm install

# 先按后端仓库说明启动 Salvo 服务（默认 127.0.0.1:8080），再启动前端
pnpm dev:ele   # http://localhost:5910
```

开发模式下 `/api` 请求经 Vite 代理转发至 `http://127.0.0.1:8080`。
默认账号见后端仓库种子数据（`admin / admin123`，生产环境务必第一时间改密）。

### 常用命令

| 命令              | 说明                                      |
| ----------------- | ----------------------------------------- |
| `pnpm dev:ele`    | 启动 web-ele 开发服务器（端口 5910）      |
| `pnpm build:ele`  | 构建 web-ele 生产包                       |
| `pnpm check:type` | 全 workspace 类型检查（vue-tsc）          |
| `pnpm lint`       | oxlint + eslint + stylelint 聚合检查      |
| `pnpm format`     | 自动修复格式                              |
| `pnpm test:unit`  | vitest 单元测试                           |

## 🛠 环境变量

配置位于 `apps/web-ele/.env*`，常用项：

| 变量                  | 说明                                    |
| --------------------- | --------------------------------------- |
| `VITE_GLOB_API_URL`   | 接口前缀，固定 `/api/v1`                |
| `VITE_PORT`           | 开发服务器端口（5910）                  |
| `VITE_ROUTER_HISTORY` | 路由模式，生产默认 hash                 |

## 🐳 Docker 部署

前端自带多阶段构建 `Dockerfile` 与 `docker/nginx.conf`（gzip、静态资源长缓存、
`/api` 反代后端服务）。推荐使用后端仓库的 docker-compose 一键编排
（MySQL + backend + frontend，frontend 构建上下文指向**同级目录**的 tide-admin）：

```bash
git clone https://github.com/xqh-jason/tide-server.git
git clone https://github.com/xqh-jason/tide-admin.git   # 与后端仓库同级存放
cd tide-server
docker compose up -d --build   # 访问 http://localhost:80
```

## 📁 目录结构

```
├── apps/web-ele          # 唯一应用（Vue 3 + Element Plus）
│   └── src
│       ├── api           # 请求层：request.ts 契约封装 + system/* 资源接口
│       ├── adapter       # vben form / vxe-table 适配 Element Plus
│       ├── views         # 页面（system/* 管理页：index.vue + data.ts + modules/form.vue）
│       ├── router        # 动态路由与守卫（backend 菜单模式）
│       ├── store         # Pinia（auth、字典缓存等）
│       └── locales       # 国际化（zh-CN / en-US）
├── packages/@core        # 与 UI 库无关的框架基础
├── packages/effects      # 可复用业务能力（access / request / layouts 等）
├── internal              # 工程配置（vite-config / tsconfig / lint-configs 等）
└── docs                  # vben 文档站（VitePress）+ superpowers 设计文档与计划
```

## 📡 接口契约要点

- 业务接口统一 **POST + JSON body**；响应包装 `{ code, data, message }`，
  `code=1` 成功 / `0` 失败，HTTP 恒 200（仅认证失败 401）
- 认证失败时请求层先凭 HttpOnly Cookie 静默调 `/auth/refresh` 续期
  （响应体为裸 token 字符串），刷新失败才触发重新认证
- 分页请求 `{ page, pageSize }`，响应 `{ total, totalPages, items }`
- 完整契约与种子数据见 [后端仓库](https://github.com/xqh-jason/tide-server)，
  联调时可参考其 Swagger UI（`/swagger-ui`）

## 🤝 开发规范

- 提交信息遵循 Conventional Commits（commitlint 在 commit-msg 阶段强制校验，
  scope 取包名枚举）
- lefthook pre-commit 会对暂存文件执行 oxlint / oxfmt / eslint / stylelint 自动修复，
  并运行全 workspace 类型检查

## 🙏 致谢

- [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) — 前端脚手架基座
- [Element Plus](https://github.com/element-plus/element-plus) / [vxe-table](https://github.com/x-extends/vxe-table)
- [Salvo](https://github.com/salvo-rs/salvo) / [SeaORM](https://github.com/SeaQL/sea-orm) — 后端框架

## 📄 License

本项目基于 [MIT](LICENSE) 协议开源，脚手架源自 Vue Vben Admin（MIT）。
