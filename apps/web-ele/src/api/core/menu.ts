/**
 * 菜单契约接口：登录后拉取当前用户的菜单树（accessMode: 'backend'）。
 */
import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户所有菜单
 * 后端按角色过滤返回 vben 菜单树（component 形如 #/views/xxx.vue，
 * 由 router/access.ts 归一化后命中本地页面组件）
 */
export async function getAllMenusApi() {
  return requestClient.post<RouteRecordStringComponent[]>('/user/menus');
}
