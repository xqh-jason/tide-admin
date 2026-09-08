import type {
  AuditFields,
  AuditFilter,
  CommonStatus,
  IdRequest,
  PageParams,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export namespace SystemJobApi {
  /** 定时任务（后端 JobResp） */
  export interface Job extends AuditFields {
    /** 6 段秒级 cron：秒 分 时 日 月 周，如 0 30 3 * * * */
    cronExpr: string;
    /** 处理器名（后端注册表白名单的键） */
    handlerName: string;
    id: number;
    /** 任务名称（全局唯一） */
    jobName: string;
    remark: string;
    /** 1 启用 / 0 停用 */
    status: CommonStatus;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** 任务名称模糊搜索 */
    jobName?: string;
    status?: CommonStatus;
  }

  export interface CreateParams {
    cronExpr: string;
    handlerName: string;
    jobName: string;
    remark?: string;
    /** 缺省 1 启用 */
    status?: CommonStatus;
  }

  /** 更新任务：全量提交，status 必填 */
  export interface UpdateParams {
    cronExpr: string;
    handlerName: string;
    id: number;
    jobName: string;
    remark?: string;
    status: CommonStatus;
  }
}

export namespace SystemJobLogApi {
  /** 定时任务执行日志（只追加记录，无审计字段） */
  export interface JobLog {
    createdAt: string;
    /** 执行耗时（毫秒） */
    durationMs: number;
    /** 失败信息（成功为空串） */
    errorMsg: string;
    id: number;
    jobId: number;
    /** 任务名称冗余存储，主任务删除后仍可读 */
    jobName: string;
    /** 1 成功 / 0 失败（字典 cronJobStatus） */
    status: CommonStatus;
  }

  export interface ListParams extends PageParams {
    /** 任务 ID 精确过滤 */
    jobId?: number;
    status?: CommonStatus;
  }
}

/**
 * 定时任务列表（分页）
 */
export async function getJobList(params: SystemJobApi.ListParams) {
  return requestClient.post<PageResult<SystemJobApi.Job>>('/job/list', params);
}

/**
 * 定时任务详情
 */
export async function getJob(id: number) {
  return requestClient.post<SystemJobApi.Job>('/job/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建定时任务（需权限码 system:job:create）
 */
export async function createJob(data: SystemJobApi.CreateParams) {
  return requestClient.post<SystemJobApi.Job>('/job/create', data);
}

/**
 * 更新定时任务（全量提交，需权限码 system:job:update）
 */
export async function updateJob(data: SystemJobApi.UpdateParams) {
  return requestClient.post<SystemJobApi.Job>('/job/update', data);
}

/**
 * 删除定时任务（软删除并移除调度，需权限码 system:job:delete）
 */
export async function deleteJob(id: number) {
  return requestClient.post<null>('/job/delete', { id } satisfies IdRequest);
}

/**
 * 更新任务状态：启用/停用并同步调度器（需权限码 system:job:update-status）
 */
export async function updateJobStatus(id: number, status: CommonStatus) {
  return requestClient.post<boolean>('/job/update-status', { id, status });
}

/**
 * 立即执行一次（异步触发，需权限码 system:job:run-once）：
 * 接口成功仅代表已触发，执行结果以执行日志为准
 */
export async function runJobOnce(id: number) {
  return requestClient.post<null>('/job/run-once', {
    id,
  } satisfies IdRequest);
}

/**
 * 定时任务执行日志列表（分页，按创建时间倒序）
 */
export async function getJobLogList(params: SystemJobLogApi.ListParams) {
  return requestClient.post<PageResult<SystemJobLogApi.JobLog>>(
    '/job-log/list',
    params,
  );
}

/**
 * 删除执行日志（软删除，需权限码 system:job-log:delete）
 */
export async function deleteJobLog(id: number) {
  return requestClient.post<null>('/job-log/delete', {
    id,
  } satisfies IdRequest);
}

/**
 * 批量删除执行日志（软删除，不存在的 id 自动忽略）
 */
export async function deleteJobLogBatch(ids: number[]) {
  return requestClient.post<number>('/job-log/delete-batch', { ids });
}
