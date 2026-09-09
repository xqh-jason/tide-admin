# W7-1 前端多阶段构建：node:22 + pnpm（corepack 钉版本）→ nginx:alpine 静态托管
# 构建产物：apps/web-ele/dist（VITE_GLOB_API_URL=/api/v1，nginx 反代后端）

# ---- builder ----
FROM node:22-alpine AS builder
# 启用 corepack：后续 pnpm 在项目目录内按 package.json 的 packageManager 字段
#（pnpm@11.16.0）自动选用对应版本，无需在此 prepare
RUN corepack enable

WORKDIR /app
# vben monorepo 依赖较多，vite 构建加大 Node 堆上限避免 OOM
ENV NODE_OPTIONS="--max-old-space-size=8192"
# CI=true：跳过根 prepare 脚本（is-ci || lefthook install）——容器内无需 git hooks，
# 且 alpine 镜像不装 git
ENV CI=true

# 先装依赖（清单变化才失效，最大化 Docker layer 缓存）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY internal ./internal
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

# 构建 web-ele（turbo 会先构建其依赖的内部包）
RUN pnpm turbo build --filter=@vben/web-ele

# ---- runtime：nginx 托管静态资源 + 反代 /api ----
FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web-ele/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
