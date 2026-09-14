/**
 * 品牌资源统一出口。
 *
 * 静态文件放在 apps/web-ele/public/brand/ 下，运行时按站点根路径（BASE_URL）访问。
 * 需要调整视觉标识时，改这里的常量或直接覆盖同名文件即可。
 */
const BASE_URL = import.meta.env.BASE_URL;

/** 品牌名称，取自 .env 的 VITE_APP_TITLE */
export const BRAND_NAME: string = import.meta.env.VITE_APP_TITLE;

/** 应用标识（浅色主题） */
export const BRAND_LOGO = `${BASE_URL}brand/logo.svg`;

/** 应用标识（暗色主题，渐变更亮以保证深色侧边栏上的对比度） */
export const BRAND_LOGO_DARK = `${BASE_URL}brand/logo-dark.svg`;

/** 登录页左侧插画 */
export const BRAND_LOGIN_SLOGAN = `${BASE_URL}brand/login-slogan.svg`;
