import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      // 固定置顶：order 取极小值，保证永远排在后端菜单（sort 生成的 order）之前
      hideChildrenInMenu: true,
      icon: 'carbon:workspace',
      order: -9999,
      title: $t('page.dashboard.workspace'),
    },
    name: 'Dashboard',
    path: '/dashboard',
    // backend 菜单模式下静态注册，无 mapTree 自动补 redirect，需显式指定
    redirect: '/dashboard/workspace',
    children: [
      {
        name: 'Workspace',
        path: 'workspace',
        component: () => import('#/views/dashboard/workspace/index.vue'),
        meta: {
          icon: 'carbon:workspace',
          title: $t('page.dashboard.workspace'),
        },
      },
    ],
  },
];

export default routes;
