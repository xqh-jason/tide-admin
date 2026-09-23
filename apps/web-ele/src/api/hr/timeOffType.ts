import type {
  AuditFields,
  IdRequest,
  PageParams,
  PageResult,
} from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 假期类型（后端域 `biz/hr/time-off` 的 `type` 段）。
 *
 * 契约要点（对齐后端 `TimeOffTypeListReq` / `CreateTimeOffTypeReq` /
 * `UpdateTimeOffTypeReq` / `TimeOffTypeResp`）：
 * - `typeCode` **单列唯一（含软删占位）**：软删的类型仍占着编码（同 `sys_position.position_code`），
 *   重建同编码会被后端拒绝；后端只允许小写字母 / 数字 / 下划线；
 * - `minUnitMinutes` 单位是**分钟**（240 = 半天、480 = 一天），不是天数；
 * - `payRatio` 是**千分比**（1000 = 全额计薪、0 = 无薪）；
 * - `balanceMode`：1 扣额度（请假时从额度账户扣减）/ 0 只记录不扣额度（如事假）；
 * - `unit`：1 天 / 2 小时，仅表示展示口径，落库时长一律按分钟；
 * - 全部端点 `POST + JSON body`；详情 / 删除只收 `{ id }`；
 * - 删除是软删，且该类型已有额度批次时后端拒绝。
 */
export namespace HrTimeOffTypeApi {
  /** 假期类型（对齐后端 `TimeOffTypeResp`） */
  export interface TimeOffType extends AuditFields {
    /** 是否允许负余额：1 是 / 0 否 */
    allowNegative: number;
    /** 额度模式：1 扣额度 / 0 只记录不扣额度 */
    balanceMode: number;
    id: number;
    /** 最小请假单位（分钟）：240 = 半天、480 = 一天 */
    minUnitMinutes: number;
    /** 计薪比例（千分比）：1000 = 全额、0 = 无薪 */
    payRatio: number;
    /** 备注 */
    remark: string;
    /** 是否必须上传附件：1 是 / 0 否 */
    requireAttachment: number;
    /** 状态（字典 status）：1 启用 / 0 停用 */
    status: number;
    /** 类型编码（单列唯一，含软删占位） */
    typeCode: string;
    /** 类型名称 */
    typeName: string;
    /** 计量单位：1 天 / 2 小时 */
    unit: number;
  }

  /** 列表请求（对齐 `TimeOffTypeListReq`）：关键字（编码/名称模糊）+ 状态精确过滤 */
  export interface ListParams extends PageParams {
    /** 模糊搜索关键字（匹配类型编码 / 类型名称）；不传查全部 */
    keyword?: string;
    /** 状态精确过滤（1 启用 / 0 停用）；不传查全部 */
    status?: number;
  }

  /** 创建参数（对齐 `CreateTimeOffTypeReq`，后端全字段必填） */
  export interface CreateParams {
    /** 是否允许负余额：1 是 / 0 否 */
    allowNegative: number;
    /** 额度模式：1 扣额度 / 0 只记录不扣额度 */
    balanceMode: number;
    /** 最小请假单位（分钟）：240 = 半天、480 = 一天 */
    minUnitMinutes: number;
    /** 计薪比例（千分比）：1000 = 全额、0 = 无薪 */
    payRatio: number;
    /** 备注（无备注传空串，不省略字段） */
    remark: string;
    /** 是否必须上传附件：1 是 / 0 否 */
    requireAttachment: number;
    /** 状态：1 启用 / 0 停用 */
    status: number;
    /** 类型编码（单列唯一，含软删占位；小写字母 / 数字 / 下划线） */
    typeCode: string;
    /** 类型名称 */
    typeName: string;
    /** 计量单位：1 天 / 2 小时 */
    unit: number;
  }

  /** 更新参数（对齐 `UpdateTimeOffTypeReq`：创建字段 + 主键，全量覆盖） */
  export interface UpdateParams extends CreateParams {
    /** 假期类型主键 */
    id: number;
  }
}

/** 假期类型列表（分页；关键字同时匹配类型编码与类型名称，status 精确过滤） */
export async function getTimeOffTypeList(
  params: HrTimeOffTypeApi.ListParams,
): Promise<PageResult<HrTimeOffTypeApi.TimeOffType>> {
  return requestClient.post<PageResult<HrTimeOffTypeApi.TimeOffType>>(
    '/hr/time-off/type/list',
    params,
  );
}

/**
 * 假期类型下拉数据源：一次取满（`pageSize` 1000 = 后端 clamp 上限），
 * 供额度发放 / 额度查询 / 请假单等页面的假期类型选择器复用
 */
export async function getAllTimeOffTypesApi(): Promise<
  HrTimeOffTypeApi.TimeOffType[]
> {
  const { items } = await getTimeOffTypeList({ page: 1, pageSize: 1000 });
  return items;
}

/** 假期类型详情（软删视为不存在，报业务错误） */
export async function getTimeOffType(
  id: number,
): Promise<HrTimeOffTypeApi.TimeOffType> {
  return requestClient.post<HrTimeOffTypeApi.TimeOffType>(
    '/hr/time-off/type/get',
    { id } satisfies IdRequest,
  );
}

/**
 * 创建假期类型（需权限码 hr:time-off-type:create）：全字段必填；
 * `typeCode` 撞唯一键（含软删占位）由后端报业务错误
 */
export async function createTimeOffType(
  data: HrTimeOffTypeApi.CreateParams,
): Promise<HrTimeOffTypeApi.TimeOffType> {
  return requestClient.post<HrTimeOffTypeApi.TimeOffType>(
    '/hr/time-off/type/create',
    data,
  );
}

/** 更新假期类型（需权限码 hr:time-off-type:update）：全字段全量覆盖 */
export async function updateTimeOffType(
  data: HrTimeOffTypeApi.UpdateParams,
): Promise<HrTimeOffTypeApi.TimeOffType> {
  return requestClient.post<HrTimeOffTypeApi.TimeOffType>(
    '/hr/time-off/type/update',
    data,
  );
}

/**
 * 删除假期类型（软删，需权限码 hr:time-off-type:delete）；
 * 该类型已有额度批次时后端拒绝
 */
export async function deleteTimeOffType(id: number) {
  return requestClient.post<null>('/hr/time-off/type/delete', {
    id,
  } satisfies IdRequest);
}
