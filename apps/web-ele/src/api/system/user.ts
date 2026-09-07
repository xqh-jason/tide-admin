import type {
  AuditFields,
  AuditFilter,
  CommonStatus,
  IdRequest,
  PageParams,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export namespace SystemUserApi {
  /** 用户（后端 UserResp + 管理页扩展字段；后端暂未返回的字段为可选） */
  export interface SystemUser extends AuditFields {
    avatar?: string;
    email: string;
    empNo: string;
    id: number;
    nickname: string;
    password?: string;
    phone?: string;
    roleIds?: number[];
    status: CommonStatus;
    username: string;
  }

  /** 用户简要信息（/user/all 返回，创建人/更新人等选择器数据源；deleted=true 为软删用户） */
  export interface UserBrief {
    /** 是否已软删（后端 bool，序列化为 true/false） */
    deleted: boolean;
    id: number;
    username: string;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** 用户名模糊搜索 */
    keyword?: string;
    status?: CommonStatus;
  }

  export interface CreateParams {
    email?: string;
    empNo: string;
    nickname: string;
    password: string;
    phone?: string;
    /** 可为空数组，后端校验角色存在且启用 */
    roleIds: number[];
    status?: CommonStatus;
    username: string;
  }

  /**
   * 更新用户：字段可选（列表状态开关等局部更新只传部分字段）；
   * 编辑抽屉提交时会显式带上全部字段（可为空字符串，空串表示清空），
   * roleIds 传入即全量替换
   */
  export interface UpdateParams {
    avatar?: string;
    email?: string;
    empNo?: string;
    id: number;
    nickname?: string;
    password?: string;
    phone?: string;
    roleIds?: number[];
    status?: CommonStatus;
    /** 编辑态禁用不可改，但全量提交语义下仍需回传 */
    username?: string;
  }
}

/**
 * 全量用户（含软删，按 id 升序；创建人/更新人等审计过滤的用户选择器数据源）
 */
export async function getAllUsersApi() {
  return requestClient.post<SystemUserApi.UserBrief[]>('/user/all', {});
}

/**
 * 用户列表（分页）
 */
export async function getUserList(params: SystemUserApi.ListParams) {
  return requestClient.post<PageResult<SystemUserApi.SystemUser>>(
    '/user/list',
    params,
  );
}

/**
 * 用户详情（对齐后端 UserResp；后端暂不返回 roleIds，角色编辑回显不可用，
 * 但提交空数组时后端跳过角色关联更新，不会清空已有角色）
 */
export async function getUser(id: number) {
  return requestClient.post<SystemUserApi.SystemUser>('/user/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建用户（需权限码 system:user:create）
 */
export async function createUser(data: SystemUserApi.CreateParams) {
  return requestClient.post<SystemUserApi.SystemUser>('/user/create', data);
}

/**
 * 更新用户（需权限码 system:user:update）
 */
export async function updateUser(data: SystemUserApi.UpdateParams) {
  return requestClient.post<SystemUserApi.SystemUser>('/user/update', data);
}

/**
 * 更新用户状态（仅切换启用/禁用，需权限码）
 */
export async function updateUserStatus(id: number, status: CommonStatus) {
  return requestClient.post<boolean>('/user/update-status', { id, status });
}

/**
 * 删除用户（软删除，需权限码 system:user:delete）
 */
export async function deleteUser(id: number) {
  return requestClient.post<null>('/user/delete', { id } satisfies IdRequest);
}
