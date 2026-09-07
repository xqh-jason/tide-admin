import { useAccessStore } from '@vben/stores';

import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    /** 验证码 id，来自 /captcha/generate */
    captchaId: string;
    /** 图片上输入的验证码 */
    captchaValue: string;
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  // 后端返回 { token }，vben store 层期望 { accessToken }，在此做字段适配
  const { token } = await requestClient.post<{ token: string }>(
    '/auth/login',
    data,
  );
  return { accessToken: token };
}

/**
 * 刷新 accessToken
 * ⚠️ 后端暂未提供 /auth/refresh 端点（只有 7 天有效期的 access token）；
 * 当前 preferences.app.enableRefreshToken 为默认 false，本函数不会被调用，
 * 后端补齐 refresh 机制前请勿开启该开关
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>(
    '/auth/refresh',
    undefined,
    {
      withCredentials: true,
    },
  );
}

/**
 * 退出登录
 * 后端 logout 挂了认证中间件，必须携带 Bearer token；走 baseRequestClient
 * 手动附加请求头，401 时直接 reject 由调用方吞掉，避免触发重新认证逻辑递归登出
 */
export async function logoutApi() {
  const { accessToken } = useAccessStore();
  return baseRequestClient.post(
    '/auth/logout',
    {},
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  );
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.post<string[]>('/user/access-codes');
}
