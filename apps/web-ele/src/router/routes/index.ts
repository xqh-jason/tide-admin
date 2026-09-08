import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules, traverseTreeValues } from '@vben/utils';

import { coreRoutes, fallbackNotFoundRoute } from './core';

const dynamicRouteFiles = import.meta.glob('./modules/**/*.ts', {
  eager: true,
});

/** 动态路由（modules 目录自动收集，按后端菜单过滤后注册） */
const dynamicRoutes: RouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

/** 路由列表，由基本路由和 404 兜底路由组成，无需走权限验证（会一直显示在菜单中） */
const routes: RouteRecordRaw[] = [...coreRoutes, fallbackNotFoundRoute];

/** 基本路由列表，这些路由不需要进入权限拦截 */
const coreRouteNames = traverseTreeValues(coreRoutes, (route) => route.name);

/** 有权限校验的路由列表 */
const accessRoutes = [...dynamicRoutes];
export { accessRoutes, coreRouteNames, routes };
