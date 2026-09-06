import type {
  AuditFields,
  CommonStatus,
  IdRequest,
  PageParams,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export namespace SystemDictionaryApi {
  /** 字典类型（对齐后端 sys_dictionary 表契约 DictionaryResp） */
  export interface Dictionary extends AuditFields {
    id: number;
    /** 字典名称（中文，展示用） */
    name: string;
    /** 字典类型编码（英文，业务键），如 gender */
    type: string;
    status: CommonStatus;
    remark: string;
  }

  /** 字典项（对齐后端 sys_dictionary_detail 表契约 DictionaryDetailResp） */
  export interface DictionaryDetail extends AuditFields {
    id: number;
    /** 所属字典类型 ID */
    dictionaryId: number;
    /** 展示值 */
    label: string;
    /** 字典值（业务键） */
    value: string;
    /** 扩展值，如 tag 颜色 */
    extend: string;
    sort: number;
    status: CommonStatus;
  }

  export interface DictionaryListParams extends PageParams {
    /** 对 name / type 模糊搜索 */
    keyword?: string;
    status?: CommonStatus;
  }

  export interface CreateDictionaryParams {
    name: string;
    type: string;
    status: CommonStatus;
    remark?: string;
  }

  /** 更新字典类型：后端全量覆盖 */
  export interface UpdateDictionaryParams {
    id: number;
    name: string;
    type: string;
    status: CommonStatus;
    remark?: string;
  }

  /** get-by-type 请求：按字典类型编码取启用项 */
  export interface DictionaryTypeParams {
    type: string;
  }

  /** get-by-type 响应中的下拉项（后端 DictionaryDetailOption） */
  export interface DictionaryDetailOption {
    /** 扩展值，如 tag 颜色 success / danger */
    extend: string;
    id: number;
    label: string;
    sort: number;
    /** 字典值，字符串形式（如 '1'） */
    value: string;
  }

  /** get-by-type 响应：类型信息 + 启用字典项 */
  export interface DictionaryOptions {
    details: DictionaryDetailOption[];
    id: number;
    name: string;
    type: string;
  }

  export interface DictionaryDetailListParams extends PageParams {
    dictionaryId?: number;
    /** 对 label / value 模糊搜索 */
    keyword?: string;
    status?: CommonStatus;
  }

  export interface CreateDictionaryDetailParams {
    dictionaryId: number;
    label: string;
    value: string;
    extend?: string;
    sort: number;
    status: CommonStatus;
  }

  /** 更新字典项：后端全量覆盖 */
  export interface UpdateDictionaryDetailParams {
    id: number;
    dictionaryId: number;
    label: string;
    value: string;
    extend?: string;
    sort: number;
    status: CommonStatus;
  }
}

/**
 * 字典类型列表（分页，keyword 对 name / type 模糊）
 */
export async function getDictionaryList(
  params: SystemDictionaryApi.DictionaryListParams,
) {
  return requestClient.post<PageResult<SystemDictionaryApi.Dictionary>>(
    '/dictionary/list',
    params,
  );
}

/**
 * 创建字典类型（需权限码 system:dictionary:create）
 */
export async function createDictionary(
  data: SystemDictionaryApi.CreateDictionaryParams,
) {
  return requestClient.post<SystemDictionaryApi.Dictionary>(
    '/dictionary/create',
    data,
  );
}

/**
 * 更新字典类型（全量覆盖，需权限码 system:dictionary:update）
 */
export async function updateDictionary(
  data: SystemDictionaryApi.UpdateDictionaryParams,
) {
  return requestClient.post<SystemDictionaryApi.Dictionary>(
    '/dictionary/update',
    data,
  );
}

/**
 * 删除字典类型（软删并级联软删其下字典项，需权限码 system:dictionary:delete）
 * @returns 级联删除的字典项数量
 */
export async function deleteDictionary(id: number) {
  return requestClient.post<number>('/dictionary/delete', {
    id,
  } satisfies IdRequest);
}

/**
 * 按字典类型编码取启用字典项（前端下拉/标签契约）
 * @param params.type 字典类型编码，如 status
 */
export async function getDictionaryByType(
  params: SystemDictionaryApi.DictionaryTypeParams,
) {
  return requestClient.post<SystemDictionaryApi.DictionaryOptions>(
    '/dictionary/get-by-type',
    params,
  );
}

/**
 * 字典项列表（分页，keyword 对 label / value 模糊）
 */
export async function getDictionaryDetailList(
  params: SystemDictionaryApi.DictionaryDetailListParams,
) {
  return requestClient.post<PageResult<SystemDictionaryApi.DictionaryDetail>>(
    '/dictionary-detail/list',
    params,
  );
}

/**
 * 创建字典项（需权限码 system:dictionary-detail:create）
 */
export async function createDictionaryDetail(
  data: SystemDictionaryApi.CreateDictionaryDetailParams,
) {
  return requestClient.post<SystemDictionaryApi.DictionaryDetail>(
    '/dictionary-detail/create',
    data,
  );
}

/**
 * 更新字典项（全量覆盖，需权限码 system:dictionary-detail:update）
 */
export async function updateDictionaryDetail(
  data: SystemDictionaryApi.UpdateDictionaryDetailParams,
) {
  return requestClient.post<SystemDictionaryApi.DictionaryDetail>(
    '/dictionary-detail/update',
    data,
  );
}

/**
 * 删除字典项（软删除，需权限码 system:dictionary-detail:delete）
 */
export async function deleteDictionaryDetail(id: number) {
  return requestClient.post<null>('/dictionary-detail/delete', {
    id,
  } satisfies IdRequest);
}
