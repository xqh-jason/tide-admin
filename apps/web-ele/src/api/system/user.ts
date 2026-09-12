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
    /** 部门挂载列表（/user/list 与 /user/get 均回填，含部门名） */
    depts?: UserDeptItem[];
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

  /** 用户简要信息（/user/list-all-includes-soft-deleted 返回，创建人/更新人等选择器数据源；deleted=true 为软删用户） */
  export interface UserBrief {
    /** 是否已软删（后端 bool，序列化为 true/false） */
    deleted: boolean;
    id: number;
    username: string;
  }

  /**
   * 用户-部门挂载项（后端 UserDeptReq/UserDeptResp）：一行 = 一个部门的一次任职。
   * isPrimary = 主要组织归属（展示/表单默认值用途，不参与数据权限），
   * depts 非空时有且仅有一个（后端校验 + DB 生成列唯一索引兜底）；
   * isLeader = 是否该部门负责人（可兼管多个），是数据权限直控凭据
   */
  export interface UserDeptItem {
    /** 部门 ID */
    deptId: number;
    /** 部门名（后端批量拼装，仅响应侧返回） */
    deptName?: string;
    /** 是否该部门负责人：1 是 / 0 否 */
    isLeader: CommonStatus;
    /** 主要组织归属：1 是 / 0 否 */
    isPrimary: CommonStatus;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** 用户名模糊搜索 */
    keyword?: string;
    status?: CommonStatus;
  }

  /**
   * 创建用户：后端 CreateUserReq 除 email/phone（serde default）外全字段
   * 必填；depts 字段必填但可为空数组（不挂部门），非空时须恰好一个
   * isPrimary=1、无重复、不超过 50 个
   */
  export interface CreateParams {
    depts: UserDeptItem[];
    email?: string;
    empNo: string;
    nickname: string;
    password: string;
    phone?: string;
    /** 可为空数组，后端校验角色存在且启用 */
    roleIds: number[];
    status: CommonStatus;
    username: string;
  }

  /**
   * 更新用户：后端 UpdateUserReq 除 email/phone（serde default）外全字段
   * 必填、全量覆盖（含禁改的 username），编辑抽屉须全量提交（空串表示清空，
   * password 空串表示不修改密码）；roleIds/depts 均为全量替换语义——
   * 后端先清空旧关联再插入，空数组即清空全部关联。状态开关走独立的
   * /user/update-status 端点，不经此接口
   */
  export interface UpdateParams {
    depts: UserDeptItem[];
    email?: string;
    empNo: string;
    id: number;
    nickname: string;
    password: string;
    phone?: string;
    roleIds: number[];
    status: CommonStatus;
    username: string;
  }
}

/**
 * 全量用户列表（含软删，用于创建人/更新人等审计选择器数据源；
 * 软删用户由调用方按 UserBrief.deleted 置灰）
 */
export async function getAllUsersApi() {
  return requestClient.post<SystemUserApi.UserBrief[]>(
    '/user/list-all-includes-soft-deleted',
    {},
  );
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
