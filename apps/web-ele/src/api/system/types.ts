/** 通用状态：1 启用 / 0 禁用（sys 表 status 字段） */
export type CommonStatus = 0 | 1;

/** 后端统一分页请求参数（经 serde flatten 平铺到各 List 请求 body 顶层） */
export interface PageParams {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数，1-1000（后端 clamp 上限 1000），缺省 10 */
  pageSize?: number;
}

/** 后端统一分页响应结构 */
export interface PageResult<T> {
  items: T[];
  total: number;
  totalPages: number;
}

export interface IdRequest {
  id: number;
}

/** 审计字段：后端各 Resp 统一返回（记录创建/更新人与时间） */
export interface AuditFields {
  createdAt?: string;
  createdByName?: string;
  updatedAt?: string;
  updatedByName?: string;
}

/**
 * 审计字段过滤参数（各实体 List 请求通用）：
 * 人员为 id 精确过滤，时间范围 yyyy-MM-dd[ HH:mm:ss] 且含边界；不传查全部
 */
export interface AuditFilter {
  createdAtBegin?: string;
  createdAtEnd?: string;
  createdBy?: number;
  updatedAtBegin?: string;
  updatedAtEnd?: string;
  updatedBy?: number;
}
