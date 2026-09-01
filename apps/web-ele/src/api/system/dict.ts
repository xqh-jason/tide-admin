import type { CommonStatus, IdRequest, PageParams, PageResult } from './types';

import { requestClient } from '#/api/request';

export namespace SystemDictApi {
  /** 数据字典项（对齐后端 sys_dict 表契约 DictResp） */
  export interface SystemDict {
    created_at?: string;
    id: number;
    /** 显示文案 */
    label: string;
    remark: string;
    sort: number;
    status: CommonStatus;
    /** 字典类型编码，如 sys_user_status */
    type_code: string;
    updated_at?: string;
    /** 字典值 */
    value: string;
  }

  export interface ListParams extends PageParams {
    /** 字典项 label 模糊搜索 */
    label?: string;
    status?: CommonStatus;
    /** 字典类型编码模糊搜索 */
    type_code?: string;
  }

  export interface CreateParams {
    label: string;
    remark?: string;
    sort?: number;
    status?: CommonStatus;
    type_code: string;
    value: string;
  }

  /** 更新字典：后端全量覆盖 */
  export interface UpdateParams {
    id: number;
    label: string;
    remark: string;
    sort: number;
    status: CommonStatus;
    type_code: string;
    value: string;
  }
}

/**
 * 数据字典列表（分页）
 */
export async function getDictList(params: SystemDictApi.ListParams) {
  return requestClient.post<PageResult<SystemDictApi.SystemDict>>(
    '/dict/list',
    params,
  );
}

/**
 * 数据字典详情
 */
export async function getDict(id: number) {
  return requestClient.post<SystemDictApi.SystemDict>('/dict/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建数据字典（需权限码 system:dict:create）
 */
export async function createDict(data: SystemDictApi.CreateParams) {
  return requestClient.post<SystemDictApi.SystemDict>('/dict/create', data);
}

/**
 * 更新数据字典（需权限码 system:dict:update）
 */
export async function updateDict(data: SystemDictApi.UpdateParams) {
  return requestClient.post<SystemDictApi.SystemDict>('/dict/update', data);
}

/**
 * 删除数据字典（软删除，需权限码 system:dict:delete）
 */
export async function deleteDict(id: number) {
  return requestClient.post<null>('/dict/delete', { id } satisfies IdRequest);
}
