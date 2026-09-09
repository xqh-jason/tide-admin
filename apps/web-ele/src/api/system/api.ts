import type {
  AuditFields,
  AuditFilter,
  CommonStatus,
  IdRequest,
  PageParams,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export namespace SystemApiApi {
  /** API 权限点（对齐后端 sys_api 表契约 ApiResp） */
  export interface SystemApi extends AuditFields {
    apiGroup: string;
    description: string;
    id: number;
    /** 请求方法，如 POST / GET / PUT / DELETE */
    method: string;
    /** 接口路径，如 /api/v1/user/list */
    path: string;
    status: CommonStatus;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** path/description/apiGroup 模糊搜索 */
    keyword?: string;
    method?: string;
    status?: CommonStatus;
  }

  export interface CreateParams {
    apiGroup?: string;
    description?: string;
    method: string;
    path: string;
    /** 后端必填（全量替换 sys_role_api）；角色授权在角色管理侧维护，表单固定传空数组 */
    roleIds: number[];
    status?: CommonStatus;
  }

  /** 更新 API：后端全量覆盖；roleIds 后端必填（全量替换，空数组清空授权） */
  export interface UpdateParams {
    apiGroup: string;
    description: string;
    id: number;
    method: string;
    path: string;
    roleIds: number[];
    status: CommonStatus;
  }
}

/**
 * API 权限点列表（分页）
 */
export async function getApiList(params: SystemApiApi.ListParams) {
  return requestClient.post<PageResult<SystemApiApi.SystemApi>>(
    '/sys-api/list',
    params,
  );
}

/**
 * 全量 API 权限点（不分页，用于角色授权的权限点勾选数据源）
 */
export async function getAllApis() {
  return requestClient.post<SystemApiApi.SystemApi[]>('/sys-api/list-all');
}

/**
 * API 权限点详情
 */
export async function getApi(id: number) {
  return requestClient.post<SystemApiApi.SystemApi>('/sys-api/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建 API（需权限码 system:api:create）
 */
export async function createApi(data: SystemApiApi.CreateParams) {
  return requestClient.post<SystemApiApi.SystemApi>('/sys-api/create', data);
}

/**
 * 更新 API（需权限码 system:api:update）
 */
export async function updateApi(data: SystemApiApi.UpdateParams) {
  return requestClient.post<SystemApiApi.SystemApi>('/sys-api/update', data);
}

/**
 * 删除 API（软删除并清空角色授权，需权限码 system:api:delete）
 */
export async function deleteApi(id: number) {
  return requestClient.post<null>('/sys-api/delete', {
    id,
  } satisfies IdRequest);
}
