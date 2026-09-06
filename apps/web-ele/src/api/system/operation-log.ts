import type { IdRequest, PageParams, PageResult } from './types';

import { requestClient } from '#/api/request';

export namespace OperationLogApi {
  /** 操作日志列表项（不含 body / resp）；只追加记录，无更新人 / 更新时间 */
  export interface OperationLog {
    id: number;
    /** 操作人 ID */
    userId: number;
    ip: string;
    method: string;
    path: string;
    /** HTTP 状态码 */
    status: number;
    /** 请求耗时（毫秒） */
    latency: number;
    agent: string;
    /** 失败提示（业务 message 或传输层错误摘要） */
    errorMessage: string;
    createdAt: string;
  }

  /** 操作日志详情：含脱敏截断后的请求体 / 响应体 */
  export interface OperationLogDetail extends OperationLog {
    /** 操作人名称（仅详情接口返回） */
    userName: string;
    body: string;
    resp: string;
  }

  export interface ListParams extends PageParams {
    /** 按路径模糊搜索 */
    keyword?: string;
    /** 操作人 ID 精确过滤 */
    userId?: number;
    /** HTTP 状态码精确过滤 */
    status?: number;
  }
}

/**
 * 操作日志列表（分页，按创建时间倒序）
 */
export async function getOperationLogList(params: OperationLogApi.ListParams) {
  return requestClient.post<PageResult<OperationLogApi.OperationLog>>(
    '/operation-log/list',
    params,
  );
}

/**
 * 操作日志详情（含请求体 / 响应体）
 */
export async function getOperationLog(id: number) {
  return requestClient.post<OperationLogApi.OperationLogDetail>(
    '/operation-log/get',
    { id } satisfies IdRequest,
  );
}

/**
 * 删除操作日志（软删除，需权限码 system:operation-log:delete）
 */
export async function deleteOperationLog(id: number) {
  return requestClient.post<null>('/operation-log/delete', {
    id,
  } satisfies IdRequest);
}
