import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules, traverseTreeValues } from '@vben/utils';

import { coreRoutes, fallbackNotFoundRoute } from './core';

const dynamicRouteFiles = import.meta.glob('./modules/**/*.ts', {
  eager: true,
});

/** 动态路由（modules 目录自动收集，按后端菜单过滤后注册） */
const dynamicRoutes: RouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

/** 路由列表，由基本路由和 404 兜底路由组成，无需走权限验证（backend 菜单模式下不进菜单） */
const routes: RouteRecordRaw[] = [...coreRoutes, fallbackNotFoundRoute];

const coreRouteNames = traverseTreeValues(coreRoutes, (route) => route.name);

const accessRoutes = [...dynamicRoutes];
export { accessRoutes, coreRouteNames, routes };
