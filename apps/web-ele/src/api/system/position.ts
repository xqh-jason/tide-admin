import type {
  AuditFields,
  AuditFilter,
  CommonStatus,
  IdRequest,
  PageParams,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export namespace SystemPositionApi {
  /** 职位（对齐后端 PositionResp，职务维度主数据） */
  export interface Position extends AuditFields {
    /** 职位编码（全局唯一，含软删占位——软删后同编码不可重建） */
    positionCode: string;
    /** 职位名称（显示名） */
    positionName: string;
    id: number;
    /** 备注，无备注为空串 */
    remark: string;
    /** 排序值，越小越靠前 */
    sort: number;
    /** 1 启用 / 0 禁用（值域经数据字典 type=status 校验） */
    status: CommonStatus;
  }

  export interface ListParams extends AuditFilter, PageParams {
    /** 模糊搜索关键字（同时匹配编码与名称）；不传查全部 */
    keyword?: string;
    status?: CommonStatus;
  }

  /**
   * 创建职位：后端全字段必填（CreatePositionReq），编码查重含软删占位行；
   * remark 无备注传空串
   */
  export interface CreateParams {
    positionCode: string;
    positionName: string;
    remark: string;
    sort: number;
    status: CommonStatus;
  }

  /** 更新职位：编辑表单全量提交（UpdatePositionReq），编码查重排除自身 */
  export interface UpdateParams extends CreateParams {
    id: number;
  }
}

/**
 * 职位列表（分页，支持审计字段过滤）
 */
export async function getPositionList(
  params: SystemPositionApi.ListParams,
): Promise<PageResult<SystemPositionApi.Position>> {
  return requestClient.post<PageResult<SystemPositionApi.Position>>(
    '/position/list',
    params,
  );
}

/**
 * 职位详情（软删视为不存在）
 */
export async function getPosition(id: number) {
  return requestClient.post<SystemPositionApi.Position>('/position/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 全量职位列表（用户表单职位选择器数据源）：
 * 后端无 list-all 端点，以 pageSize=1000（后端分页上限）取一页兜底；
 * 不传 status 过滤，含禁用职位（历史挂载需可见回显）
 */
export async function getAllPositions(): Promise<SystemPositionApi.Position[]> {
  const { items } = await getPositionList({ page: 1, pageSize: 1000 });
  return items;
}

/**
 * 创建职位（需权限码 system:position:create）；编码全局唯一（含软删占位），
 * 撞编码后端报业务错误
 */
export async function createPosition(
  data: SystemPositionApi.CreateParams,
): Promise<SystemPositionApi.Position> {
  return requestClient.post<SystemPositionApi.Position>(
    '/position/create',
    data,
  );
}

/**
 * 更新职位（全量提交，需权限码 system:position:update）
 */
export async function updatePosition(
  data: SystemPositionApi.UpdateParams,
): Promise<SystemPositionApi.Position> {
  return requestClient.post<SystemPositionApi.Position>(
    '/position/update',
    data,
  );
}

/**
 * 删除职位（软删除，需权限码 system:position:delete）；
 * 已被用户挂载时后端拒绝（提示先解除挂载）
 */
export async function deletePosition(id: number) {
  return requestClient.post<null>('/position/delete', {
    id,
  } satisfies IdRequest);
}
