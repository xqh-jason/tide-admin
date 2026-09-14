import { useAccessStore } from '@vben/stores';

import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    /** 验证码 id，来自 /captcha/generate */
    captchaId: string;
    captchaValue: string;
    password?: string;
    username?: string;
  }

  export interface LoginResult {
    accessToken: string;
  }

  /**
   * 刷新 token 的响应形状：baseRequestClient 是原始 axios 实例，
   * 不经过 { code, data } 统一契约解包，因此拿到的是 HTTP 层的
   * { data, status }，与 requestClient 的返回结构不同
   */
  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

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
 * 后端契约：POST /auth/refresh 公开端点，凭 HttpOnly Cookie 中的 refresh token
 * 换发新 access token；成功响应体是**裸 token 字符串**（非 {code,data} 包裹），
 * 失败返回真 HTTP 401
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

export async function getAccessCodesApi() {
  return requestClient.post<string[]>('/user/access-codes');
}
