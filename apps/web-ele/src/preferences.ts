import { defineOverridesPreferences } from '@vben/preferences';

import { BRAND_LOGO, BRAND_LOGO_DARK } from '#/brand';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    // 菜单与权限码全部由后端返回，前端不硬编码路由权限
    accessMode: 'backend',
    // 后端已提供 /auth/refresh（HttpOnly Cookie 承载 refresh token），
    // 401 时先静默刷新，失败才走重新认证
    enableRefreshToken: true,
    name: import.meta.env.VITE_APP_TITLE,
  },
  theme: {
    mode: 'light',
  },
  // 页脚版权：不展开 appCopyrightPreferences，那里面是 vben 自己的署名与备案号
  // （companyName: 'Vben' / icp: '闽ICP备19024351号'），直接用会顶着别人的备案信息。
  // 这里显式给出自己的值；icp 留空则备案那一段整体不渲染。
  // companySiteLink 有正式站点时再补，留空时组件会退化成不可跳转的占位链接。
  copyright: {
    companyName: 'Tide',
    companySiteLink: '',
    date: '2026',
    enable: true,
    icp: '',
    icpLink: 'https://beian.miit.gov.cn/',
    settingShow: true,
  },
  // 使用自有品牌标识，替换掉 vben 默认的远程 logo
  logo: {
    source: BRAND_LOGO,
    sourceDark: BRAND_LOGO_DARK,
  },
});
