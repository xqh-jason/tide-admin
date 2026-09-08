import type {
  AuditFields,
  AuditFilter,
  CommonStatus,
  IdRequest,
  PageParams,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export namespace SystemRoleApi {
  /** 角色（对齐后端 w3-role-crud 契约 RoleResp） */
  export interface SystemRole extends AuditFields {
    id: number;
    /** 已授权菜单+按钮 id 平铺列表（含半选父节点），编辑回显用 */
    menuIds?: number[];
    remark: string;
    roleKey: string;
    roleName: string;
    sort: number;
    status: CommonStatus;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** 角色名/角色键模糊搜索 */
    keyword?: string;
    status?: CommonStatus;
  }

  export interface CreateParams {
    /** 接口 id 列表（W3 第一版授权链路不使用，预留） */
    apiIds?: number[];
    /** 菜单+按钮 id 列表，传入即全量替换 sys_role_menu */
    menuIds?: number[];
    remark?: string;
    /** 全局唯一，超管固定为 super */
    roleKey: string;
    roleName: string;
    sort?: number;
    status?: CommonStatus;
  }

  /**
   * 更新角色：除 id 外全部可选，后端对未传字段不做修改；
   * menuIds/apiIds 传 null 视为不修改，传数组即全量替换
   */
  export interface UpdateParams {
    apiIds?: null | number[];
    id: number;
    menuIds?: null | number[];
    remark?: string;
    roleKey?: string;
    roleName?: string;
    sort?: number;
    status?: CommonStatus;
  }
}

/**
 * 全量角色列表（不分页，用于下拉选择等场景）
 */
export async function getAllRoles() {
  return requestClient.post<SystemRoleApi.SystemRole[]>('/role/list-all');
}

/**
 * 角色列表（分页）
 */
export async function getRoleList(params: SystemRoleApi.ListParams) {
  return requestClient.post<PageResult<SystemRoleApi.SystemRole>>(
    '/role/list',
    params,
  );
}

/**
 * 角色详情
 */
export async function getRole(id: number) {
  return requestClient.post<SystemRoleApi.SystemRole>('/role/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建角色（需权限码 system:role:create）
 */
export async function createRole(data: SystemRoleApi.CreateParams) {
  return requestClient.post<SystemRoleApi.SystemRole>('/role/create', data);
}

/**
 * 更新角色（需权限码 system:role:update）
 */
export async function updateRole(data: SystemRoleApi.UpdateParams) {
  return requestClient.post<SystemRoleApi.SystemRole>('/role/update', data);
}

/**
 * 更新角色状态（仅切换启用/禁用，需权限码；超管角色不可改）
 */
export async function updateRoleStatus(id: number, status: CommonStatus) {
  return requestClient.post<boolean>('/role/update-status', { id, status });
}

/**
 * 删除角色（软删除并清空关联，需权限码 system:role:delete）
 */
export async function deleteRole(id: number) {
  return requestClient.post<null>('/role/delete', { id } satisfies IdRequest);
}
