import {
  appCopyrightPreferences,
  defineOverridesPreferences,
} from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    // 菜单与权限码全部由后端返回，前端不硬编码路由权限
    accessMode: 'backend',
    // 后端已提供 /auth/refresh（HttpOnly Cookie 承载 refresh token），
    // 401 时先静默刷新，失败才走重新认证
    enableRefreshToken: true,
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: appCopyrightPreferences,
});
