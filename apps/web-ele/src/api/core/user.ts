import type { UserInfo } from '@vben/types';

import { preferences } from '@vben/preferences';

import { requestClient } from '#/api/request';

/** 后端 /user/info 响应：嵌套的 { userInfo, roles } 结构 */
interface BackendUserInfoResponse {
  roles: string[];
  userInfo: {
    email: string;
    id: number;
    nickname: string;
    status: number;
    username: string;
  };
}

/**
 * 获取用户信息
 * 后端返回嵌套结构，vben 消费扁平 UserInfo，在此做字段映射
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  const { userInfo, roles } =
    await requestClient.post<BackendUserInfoResponse>('/user/info');

  return {
    avatar: preferences.app.defaultAvatar,
    desc: '',
    email: userInfo.email,
    homePath: '',
    nickname: userInfo.nickname,
    realName: userInfo.nickname,
    roles,
    status: userInfo.status,
    token: '',
    userId: String(userInfo.id),
    username: userInfo.username,
  };
}
