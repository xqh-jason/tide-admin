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
   * 更新用户：后端 UpdateUserReq 除 email/phone（serde default）外
   * 全字段必填，编辑抽屉提交时显式带上全部字段（空串表示清空）。
   * roleIds 非空即全量替换（先删旧关联再插入）；空数组时后端直接
   * 跳过角色关联更新，不会清空已有角色。状态开关走独立的
   * /user/update-status 端点，不经此接口
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
 * 全量用户列表（不分页，用于创建人/更新人等下拉数据源）
 */
export async function getAllUsersApi() {
  return requestClient.post<SystemUserApi.UserBrief[]>('/user/list-all', {});
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
 * 用户详情
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
