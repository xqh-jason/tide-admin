import type {
  AuditFields,
  IdRequest,
  PageParams,
  PageResult,
} from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 班次定义（考勤域主数据，`hr_shift`）。
 *
 * 契约要点（对齐后端 `dto.rs` 的 `CreateShiftReq` / `UpdateShiftReq` / `ShiftResp`）：
 * - `startTime` / `endTime` 是「到点时间」字符串，格式固定 `HH:MM:SS`（非日期时间）；
 * - `crossDay = 1` 表示 `endTime` 落在次日（跨天班窗口 = `endTime + 24h − startTime`）；
 * - `workMinutes + restMinutes` **不得超过班次窗口**（后端校验；窗口逐日封顶，
 *   即 `derive_work_minutes` 的逐日取值不会大于 `workMinutes`，故前端必须让二者落在窗口内）；
 * - `hr_shift` 是全域**唯一软删主表**：班次会被历史排班引用（删除后旧排班仍要能取名），
 *   因此删除是软删、`shiftCode` 单列唯一（含软删占位，重录同编码会撞唯一键）；
 * - `status` 值域来自平台字典 `status`（1 启用 / 0 停用），由后端按字典校验。
 */
export namespace HrAttendanceShiftApi {
  /** 班次（对齐后端 `ShiftResp`） */
  export interface Shift extends AuditFields {
    /** 是否跨天班：1 是（`endTime` 落在次日）0 否 */
    crossDay: number;
    /** 创建人 ID（sys_user.id） */
    createdBy?: number;
    /** 下班时间（`HH:MM:SS`） */
    endTime: string;
    id: number;
    /** 迟到宽限分钟数 */
    lateToleranceMinutes: number;
    /** 是否需要打卡：1 需要 0 不需要 */
    needClock: number;
    /** 备注 */
    remark: string;
    /** 休息分钟数 */
    restMinutes: number;
    /** 班次编码（单列唯一，含软删占位） */
    shiftCode: string;
    /** 班次名称 */
    shiftName: string;
    /** 上班时间（`HH:MM:SS`） */
    startTime: string;
    /** 状态：1 启用 0 停用 */
    status: number;
    /** 更新人 ID（sys_user.id） */
    updatedBy?: number;
    /** 应工作分钟数（已扣除休息） */
    workMinutes: number;
  }

  /** 班次列表请求（后端 `ShiftListReq`）：分页平铺 + 关键字 / 状态过滤 */
  export interface ListParams extends PageParams {
    /** 模糊搜索关键字（匹配班次编码 / 班次名称）；不传查全部 */
    keyword?: string;
    /** 状态精确过滤（1 启用 / 0 停用）；不传查全部 */
    status?: number;
  }

  /** 创建班次请求（后端 `CreateShiftReq`）：全字段必填，无独立启停端点 */
  export interface CreateParams {
    /** 是否跨天班：1 是 0 否 */
    crossDay: number;
    /** 下班时间（`HH:MM:SS`） */
    endTime: string;
    /** 迟到宽限分钟数（≥ 0） */
    lateToleranceMinutes: number;
    /** 是否需要打卡：1 需要 0 不需要 */
    needClock: number;
    /** 备注（≤ 255 字符，空串表示无） */
    remark: string;
    /** 休息分钟数（≥ 0） */
    restMinutes: number;
    /** 班次编码（≤ 32 字符，仅小写字母 / 数字 / 下划线，全局唯一） */
    shiftCode: string;
    /** 班次名称（≤ 64 字符） */
    shiftName: string;
    /** 上班时间（`HH:MM:SS`） */
    startTime: string;
    /** 状态：1 启用 0 停用（值域取自平台字典 `status`） */
    status: number;
    /** 应工作分钟数（> 0 且 ≤ 1440；与 `restMinutes` 之和 ≤ 班次窗口） */
    workMinutes: number;
  }

  /** 更新班次请求（后端 `UpdateShiftReq`）：字段与创建一致 + 主键，全量提交 */
  export interface UpdateParams extends CreateParams {
    /** 班次主键 */
    id: number;
  }
}

/**
 * 班次列表（分页；关键字匹配班次编码 / 名称，状态精确过滤）
 */
export async function getAttendanceShiftList(
  params: HrAttendanceShiftApi.ListParams,
): Promise<PageResult<HrAttendanceShiftApi.Shift>> {
  return requestClient.post<PageResult<HrAttendanceShiftApi.Shift>>(
    '/hr/attendance/shift/list',
    params,
  );
}

/**
 * 班次下拉数据源：一次取满（`pageSize` 1000 = 后端 clamp 上限）并返回数组，
 * 供排班页等需要「按班次选择」的页面复用（后端无 shift list-all 端点）
 */
export async function getAllAttendanceShiftsApi(): Promise<
  HrAttendanceShiftApi.Shift[]
> {
  const { items } = await getAttendanceShiftList({ page: 1, pageSize: 1000 });
  return items;
}

/**
 * 班次详情（软删视为不存在，报业务错误）
 */
export async function getAttendanceShift(id: number) {
  return requestClient.post<HrAttendanceShiftApi.Shift>(
    '/hr/attendance/shift/get',
    { id } satisfies IdRequest,
  );
}

/**
 * 创建班次（需权限码 hr:attendance-shift:create）：
 * `shiftCode` 全局唯一（含软删占位），撞编码由后端报业务错误
 */
export async function createAttendanceShift(
  data: HrAttendanceShiftApi.CreateParams,
): Promise<HrAttendanceShiftApi.Shift> {
  return requestClient.post<HrAttendanceShiftApi.Shift>(
    '/hr/attendance/shift/create',
    data,
  );
}

/**
 * 更新班次（需权限码 hr:attendance-shift:update）：全字段提交
 */
export async function updateAttendanceShift(
  data: HrAttendanceShiftApi.UpdateParams,
): Promise<HrAttendanceShiftApi.Shift> {
  return requestClient.post<HrAttendanceShiftApi.Shift>(
    '/hr/attendance/shift/update',
    data,
  );
}

/**
 * 删除班次（**软删除**，需权限码 hr:attendance-shift:delete）：
 * 班次被历史排班引用，软删后旧排班仍可取名，故不校验引用关系
 */
export async function deleteAttendanceShift(id: number) {
  return requestClient.post<null>('/hr/attendance/shift/delete', {
    id,
  } satisfies IdRequest);
}
