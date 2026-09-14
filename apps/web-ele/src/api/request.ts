/**
 * requestClient 工厂与全局拦截器（对接 Salvo 后端统一契约）。
 *
 * 契约要点：
 * - baseURL 取环境配置 /api/v1（dev 下经 vite proxy 转发到 127.0.0.1:8080）；
 * - 业务接口全 POST + JSON body；请求头统一注入 Bearer token 与 Accept-Language；
 * - 响应包装 { code, data, message }，code=1 成功 / 0 失败（HTTP 恒 200，
 *   仅认证失败返回 401），successCode 必须为 1（vben 默认 0）；
 * - 后端已提供 /auth/refresh（refresh token 走 HttpOnly Cookie），已开启
 *   enableRefreshToken
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑：清空 token 后按偏好设置选择「登录过期弹窗」或直接登出
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新 token 逻辑：由 authenticateResponseInterceptor 在收到 401 时调用
   * （enableRefreshToken 为 true 时启用），refresh token 走 HttpOnly Cookie
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式（后端统一契约：{ code: 1, data, message }，code=1 成功 / 0 失败）
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 1,
    }),
  );

  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 后端失败响应为 { code, data, message }（HTTP 恒 200），
      // 错误文案优先取 error，回退 message
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.message ?? '';
      ElMessage.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

/**
 * 不套统一响应契约的客户端：保留 RequestClient 默认的 responseReturn: 'raw'，
 * 用于 /auth/refresh 等需要读取 HTTP 层 { data, status } 的场景
 * （见 api/core/auth.ts 的 refreshTokenApi）
 */
export const baseRequestClient = new RequestClient({ baseURL: apiURL });
