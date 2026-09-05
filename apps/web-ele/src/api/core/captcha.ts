import { requestClient } from '#/api/request';

export namespace CaptchaApi {
  /** 图形验证码 */
  export interface CaptchaResult {
    /** 本次验证码唯一 id，登录时原样回传 */
    captcha_id: string;
    /** 裸 base64 PNG，不含 `data:` 前缀 */
    image: string;
  }
}

/**
 * 生成图形验证码（无需登录态）
 * 有效期 3 分钟，且一次性消费：校验一次（无论成败）即失效，失败重试前须重新生成
 */
export async function generateCaptchaApi() {
  return requestClient.post<CaptchaApi.CaptchaResult>('/captcha/generate', {});
}
