import type { IdRequest, PageParams, PageResult } from './types';

import { requestClient } from '#/api/request';

export namespace SystemSessionApi {
  /**
   * 在线会话（对齐后端 sys_refresh_token 契约 RefreshTokenResp）：
   * 一条登录刷新凭证即一个会话；明文 token 与哈希不回传
   */
  export interface Session {
    id: number;
    /** 登录用户 ID */
    userId: number;
    /** 登录用户名（冗余快照） */
    username: string;
    /** 登录 IP */
    ip: string;
    /** 登录 User-Agent */
    agent: string;
    /** 登录时间（yyyy-MM-dd HH:mm:ss） */
    createdAt: string;
    /** 最后活跃时间（60s 节流回写，5 分钟内视为在线） */
    lastActiveAt: string;
    /** 会话过期时间（登录时刻 + refresh ttl） */
    expiresAt: string;
    /** 是否在线（后端按 lastActiveAt 5 分钟窗口计算） */
    online: boolean;
    /** 吊销时间；null 表示会话有效 */
    revokedAt: null | string;
    /** 吊销操作人（0=本人登出/系统，>0=管理员用户 ID） */
    revokedBy: number;
    /** 吊销原因（用户登出/管理员强制下线） */
    revokeReason: string;
  }

  export interface ListParams extends PageParams {
    /** 仅看在线会话（lastActiveAt 在 5 分钟窗口内）；不传查全部 */
    onlineOnly?: boolean;
    /** 用户名模糊搜索 */
    username?: string;
  }
}

/**
 * 会话列表（分页，按登录时间倒序）
 */
export async function getSessionList(
  params: SystemSessionApi.ListParams,
): Promise<PageResult<SystemSessionApi.Session>> {
  return requestClient.post<PageResult<SystemSessionApi.Session>>(
    '/refresh-token/list',
    params,
  );
}

/**
 * 强制下线（吊销指定会话并盖章操作人，需权限码 system:session:force-logout）；
 * 会话不存在或已下线时后端报业务错误
 */
export async function forceLogoutSession(id: number) {
  return requestClient.post<null>('/refresh-token/force-logout', {
    id,
  } satisfies IdRequest);
}

/**
 * 删除会话记录（物理删除，仅限已下线/已过期的死记录，需权限码 system:session:delete）；
 * 会话仍在线时后端拒绝并提示先强制下线
 */
export async function deleteSession(id: number) {
  return requestClient.post<null>('/refresh-token/delete', {
    id,
  } satisfies IdRequest);
}

/**
 * 批量删除会话记录（物理删除；在线/未过期会话被后端静默跳过，
 * 返回受影响行数；与单条删除共用权限码 system:session:delete）
 */
export async function deleteSessionBatch(ids: number[]) {
  return requestClient.post<number>('/refresh-token/delete-batch', { ids });
}

/**
 * 踢出指定用户的全部会话（吊销其所有仍然有效的凭证，需权限码 system:session:force-logout）；
 * 返回受影响会话数，0 表示该用户当前没有在线会话。
 * 后端允许管理员对自己操作——踢自己即立刻掉线，需重新登录
 */
export async function forceLogoutUserSessions(userId: number) {
  return requestClient.post<number>('/refresh-token/force-logout-user', {
    userId,
  });
}
