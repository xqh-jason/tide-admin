/** 通用状态：1 启用 / 0 禁用（sys 表 status 字段） */
export type CommonStatus = 0 | 1;

/** 后端统一分页请求参数（经 serde flatten 平铺到各 List 请求 body 顶层） */
export interface PageParams {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数，1-100，缺省 10 */
  pageSize?: number;
}

/** 后端统一分页响应结构 */
export interface PageResult<T> {
  items: T[];
  total: number;
  totalPages: number;
}

/** 按 id 操作的请求体 */
export interface IdRequest {
  id: number;
}

/** 审计字段：后端各 Resp 统一返回（记录创建/更新人与时间） */
export interface AuditFields {
  createdAt?: string;
  /** 创建人姓名 */
  createdByName?: string;
  updatedAt?: string;
  /** 更新人姓名 */
  updatedByName?: string;
}

/**
 * 审计字段过滤参数（各实体 List 请求通用）：
 * 人员为 id 精确过滤，时间范围 yyyy-MM-dd[ HH:mm:ss] 且含边界；不传查全部
 */
export interface AuditFilter {
  /** 创建时间范围起（含边界） */
  createdAtBegin?: string;
  /** 创建时间范围止（含边界） */
  createdAtEnd?: string;
  /** 创建人 ID 精确过滤 */
  createdBy?: number;
  /** 更新时间范围起（含边界） */
  updatedAtBegin?: string;
  /** 更新时间范围止（含边界） */
  updatedAtEnd?: string;
  /** 更新人 ID 精确过滤 */
  updatedBy?: number;
}
