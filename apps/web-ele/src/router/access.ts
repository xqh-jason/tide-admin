import type { Router, RouteRecordRaw } from 'vue-router';

import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { generateMenus } from '@vben/utils';

import { ElMessage } from 'element-plus';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

import dashboardRoutes from './routes/modules/dashboard';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * 归一化后端菜单 component 为 vben 可命中 pageMap 的路径：
 * `#/views/system/user/index.vue` → `/system/user/index`
 * （normalizeViewPath 只剥离开头 `/views`，带 `#/views` 前缀会匹配失败落到 404）。
 */
function normalizeComponent(component: string): string {
  return component.replace(/^#\/views\//, '/').replace(/\.vue$/, '');
}

/** 递归归一化整棵菜单树的 component */
function normalizeMenuComponents(
  routes: RouteRecordStringComponent[],
): RouteRecordStringComponent[] {
  return routes.map((route) => ({
    ...route,
    component: route.component
      ? normalizeComponent(route.component)
      : route.component,
    children: route.children?.length
      ? normalizeMenuComponents(route.children)
      : route.children,
  }));
}

/**
 * 注册前端自有路由（主页 dashboard 等不依赖后端菜单的页面）。
 * backend 模式下 `generateRoutesByBackend` 只消费后端菜单，
 * 静态路由须挂到根路由（`/`，BasicLayout）的 children 下才会套布局。
 */
function registerFrontendRoutes(router: Router, routes: RouteRecordRaw[]) {
  const root = router.getRoutes().find((item) => item.path === '/');
  for (const route of routes) {
    // 幂等：重新登录时避免重复注册同名路由
    if (route.name && router.hasRoute(route.name as string)) {
      continue;
    }
    if (root && !route.meta?.noBasicLayout) {
      root.children?.push(route);
    } else {
      router.addRoute(route);
    }
  }
  if (root?.name) {
    router.removeRoute(root.name);
    router.addRoute(root);
  }
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  const result = await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      ElMessage({
        duration: 1500,
        message: `${$t('common.loadingMenu')}...`,
      });
      const menus = await getAllMenusApi();
      // 归一化 component 命中 pageMap（后端菜单 component 带 #/views 前缀）
      return normalizeMenuComponents(menus);
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });

  // 主页为前端自有路由，不依赖后端菜单；注册路由并并入菜单展示
  registerFrontendRoutes(options.router, dashboardRoutes);

  // 侧边栏按数组顺序渲染：合并后须整体按 order 排序，
  // 否则后端菜单（generateAccessible 内部各自有序）会排在前端主页之前
  const frontendMenus = generateMenus(dashboardRoutes, options.router);
  const accessibleMenus = [
    ...frontendMenus,
    ...result.accessibleMenus,
  ].toSorted((a, b) => (a?.order ?? 999) - (b?.order ?? 999));

  return {
    accessibleMenus,
    accessibleRoutes: [...result.accessibleRoutes, ...dashboardRoutes],
  };
}

export { generateAccess };
