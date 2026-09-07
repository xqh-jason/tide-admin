import type {
  AuditFields,
  AuditFilter,
  CommonStatus,
  IdRequest,
  PageParams,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export namespace SystemMenuApi {
  /** 菜单类型：1 目录 / 2 菜单 / 3 按钮 */
  export type MenuType = 1 | 2 | 3;

  /** 菜单节点（对齐 sys_menu 表字段，管理接口使用平铺列表） */
  export interface SystemMenu extends AuditFields {
    children?: SystemMenu[];
    component: string;
    /** 1 隐藏 / 0 显示，输出到 vben meta.hideInMenu */
    hidden: CommonStatus;
    icon: string;
    id: number;
    /** 1 缓存 / 0 不缓存，输出到 vben meta.keepAlive */
    keepAlive: CommonStatus;
    menuType: MenuType;
    /** 路由名，全局唯一 */
    name: string;
    /** 父菜单 id，0 为顶级 */
    parentId: number;
    path: string;
    /** 按钮权限码，格式 模块:实体:动作 */
    permission: string;
    sort: number;
    status: CommonStatus;
    title: string;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** 标题/路由名/路径模糊搜索 */
    keyword?: string;
    status?: CommonStatus;
  }

  export interface CreateParams {
    component?: string;
    hidden?: CommonStatus;
    icon?: string;
    keepAlive?: CommonStatus;
    menuType: MenuType;
    name?: string;
    parentId: number;
    path?: string;
    permission?: string;
    sort?: number;
    status?: CommonStatus;
    title: string;
  }

  /** 更新菜单：除 id 外全部可选，后端对未传字段不做修改 */
  export interface UpdateParams {
    component?: string;
    hidden?: CommonStatus;
    icon?: string;
    id: number;
    keepAlive?: CommonStatus;
    menuType?: MenuType;
    name?: string;
    parentId?: number;
    path?: string;
    permission?: string;
    sort?: number;
    status?: CommonStatus;
    title?: string;
  }
}

/**
 * 菜单平铺列表（含按钮节点，按 sort、id 升序）。
 * 菜单树需一次性取全量组树，故固定以单页拉全量；
 * 后端 PageQuery 的 pageSize 上限为 1000（clamp(1, 1000)），
 * 菜单数量超过上限时需由调用方自行处理或后端提供树接口
 */
export async function getMenuList(
  params: SystemMenuApi.ListParams = {},
): Promise<PageResult<SystemMenuApi.SystemMenu>> {
  return requestClient.post<PageResult<SystemMenuApi.SystemMenu>>(
    '/menu/list',
    { page: 1, pageSize: 1000, ...params },
  );
}

/**
 * 创建菜单（需权限码 system:menu:create）
 */
export async function createMenu(data: SystemMenuApi.CreateParams) {
  return requestClient.post<SystemMenuApi.SystemMenu>('/menu/create', data);
}

/**
 * 更新菜单（需权限码 system:menu:update）
 */
export async function updateMenu(data: SystemMenuApi.UpdateParams) {
  return requestClient.post<SystemMenuApi.SystemMenu>('/menu/update', data);
}

/**
 * 删除菜单（软删除；有子节点时后端应拒绝，需权限码 system:menu:delete）
 */
export async function deleteMenu(id: number) {
  return requestClient.post<null>('/menu/delete', { id } satisfies IdRequest);
}

/**
 * 将平铺菜单列表按 parentId 组装成树，同级按 sort、id 升序；
 * 叶子节点不携带 children 字段
 */
export function buildMenuTree(
  menus: SystemMenuApi.SystemMenu[],
): SystemMenuApi.SystemMenu[] {
  const byParent = new Map<number, SystemMenuApi.SystemMenu[]>();
  for (const menu of menus) {
    const list = byParent.get(menu.parentId) ?? [];
    list.push(menu);
    byParent.set(menu.parentId, list);
  }
  const attach = (
    nodes: SystemMenuApi.SystemMenu[],
  ): SystemMenuApi.SystemMenu[] =>
    nodes
      .toSorted((a, b) => a.sort - b.sort || a.id - b.id)
      .map((node) => {
        const children = byParent.get(node.id);
        return children?.length
          ? { ...node, children: attach(children) }
          : { ...node };
      });
  return attach(byParent.get(0) ?? []);
}
