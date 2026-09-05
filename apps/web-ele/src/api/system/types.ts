/** 通用状态：1 启用 / 0 禁用（sys 表 status 字段） */
export type CommonStatus = 0 | 1;

/** 后端统一分页请求参数（经 serde flatten 平铺到各 List 请求 body 顶层） */
export interface PageParams {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数，1-100，缺省 10 */
  page_size?: number;
}

/** 后端统一分页响应结构 */
export interface PageResult<T> {
  items: T[];
  total: number;
  total_pages: number;
}

/** 按 id 操作的请求体 */
export interface IdRequest {
  id: number;
}

/** 审计字段：后端各 Resp 统一返回（记录创建/更新人与时间） */
export interface AuditFields {
  created_at?: string;
  /** 创建人姓名 */
  created_by_name?: string;
  updated_at?: string;
  /** 更新人姓名 */
  updated_by_name?: string;
}
