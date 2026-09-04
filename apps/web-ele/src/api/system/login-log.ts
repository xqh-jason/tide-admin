import type { CommonStatus, IdRequest, PageParams, PageResult } from './types';

import { requestClient } from '#/api/request';

export namespace LoginLogApi {
  /** 登录日志（对齐后端 sys_login_log 契约 LoginLogResp） */
  export interface LoginLog {
    id: number;
    /** 登录成功后的用户 ID，失败为 0 */
    user_id: number;
    /** 本次尝试的用户名 */
    username: string;
    ip: string;
    agent: string;
    /** 1 成功 / 0 失败 */
    status: CommonStatus;
    /** 内部原因或成功提示 */
    msg: string;
    created_at: string;
  }

  export interface ListParams extends PageParams {
    /** 用户名模糊搜索 */
    username?: string;
    /** IP 模糊搜索 */
    ip?: string;
    status?: CommonStatus;
  }
}

/**
 * 登录日志列表（分页，按创建时间倒序）
 */
export async function getLoginLogList(params: LoginLogApi.ListParams) {
  return requestClient.post<PageResult<LoginLogApi.LoginLog>>(
    '/login-log/list',
    params,
  );
}

/**
 * 删除登录日志（软删除，需权限码 system:login-log:delete）
 */
export async function deleteLoginLog(id: number) {
  return requestClient.post<null>('/login-log/delete', {
    id,
  } satisfies IdRequest);
}
