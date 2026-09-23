import { requestClient } from '#/api/request';

/**
 * HR 表单附件上传（请假单 / 加班单请求体里的 `attachmentId` 来源）。
 *
 * 契约要点：
 * - 后端 `POST /api/v1/file/upload` 是**全仓唯一的 multipart 端点**（其余业务接口都是
 *   POST + JSON body），字段名固定 `file`，成功返回信封内的
 *   `FileUploadResp { id, name, storedName, ext, mime, size, url, createdBy, createdByName }`；
 * - 限制由后端 `[upload]` 配置决定：单文件 ≤ 10MB、扩展名白名单（图片 / pdf / office / txt / zip），
 *   前端 `accept` 只是同源的提示，真正判定在后端；
 * - 上传人取自 JWT，请求体永不传人字段；
 * - 请假单：假期类型的 `requireAttachment = 1` 时（种子里的病假 / 婚假 / 产假）后端**强制要求**附件，
 *   没有上传通道这些类型无法建单，故此封装是申请表的一部分。
 *
 * 平台前端暂无文件域封装（没有文件管理页，`/file/{list,get,delete}` 未接线），
 * 这里只做 HR 表单需要的最小封装；平台将来补 `api/system/file.ts`（平台代码，须先落 `main`）后
 * 应改由它统一提供。
 */

/** 上传成功的文件记录（HR 表单只用 `id` 与展示用的 `name`） */
export interface HrAttachment {
  id: number;
  name: string;
  size: number;
  /** 下载地址：`/api/v1/file/download?id={id}` */
  url: string;
}

/** 与后端 `[upload].allows` 同源的扩展名提示（真正校验在服务端） */
export const ATTACHMENT_ACCEPT =
  '.png,.jpg,.jpeg,.gif,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';

/** 上传附件并返回文件记录；失败由 request 拦截器统一提示 */
export async function uploadHrAttachment(file: File): Promise<HrAttachment> {
  return requestClient.upload<HrAttachment>('/file/upload', { file });
}
