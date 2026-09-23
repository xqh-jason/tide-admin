import type { PageParams, PageResult } from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 排班管理（对齐后端 `modules/biz/hr/attendance` 的 `Schedule*` DTO）。
 *
 * 契约要点：
 * - 排班表 `hr_shift_schedule` **不软删**：写入一律是「按唯一键
 *   `(employeeId, workDate)` upsert」，命中已有行即覆盖，重录不会撞唯一键；
 * - 批量排班上限（后端 validate）：去重后人数 ≤ 1000、区间跨度 ≤ 366 天、
 *   `人数 × 天数` ≤ 10000 行，超出后端报业务错误；
 * - `shiftId = 0` 表示当天休息（不是「未排班」）；`status` 取值 1 正常 / 2 已换班
 *   （`mod.rs` 的 `SCHEDULE_STATUSES`），不传默认 1；
 * - 月视图里「未排班」是响应侧占位（`status = 0`），不落库。
 */
export namespace HrAttendanceScheduleApi {
  /**
   * 批量排班回执（后端 `BatchCreateScheduleResp`）：
   * 命中已有排班即更新（`updated`），否则新建（`created`）
   */
  export interface BatchCreateResult {
    /** 新建的排班行数 */
    created: number;
    /** 更新（覆盖）的排班行数 */
    updated: number;
  }

  /** 批量排班请求（后端 `BatchCreateScheduleReq`，唯一键 `(employeeId, workDate)` 逐日 upsert） */
  export interface BatchCreateParams {
    /** 员工档案 ID 列表（去重后逐日排班；去重后上限 1000 人） */
    employeeIds: number[];
    /** 区间止（`yyyy-MM-dd`，含）；与 startDate 跨度上限 366 天 */
    endDate: string;
    /** 备注（上限 255 字符） */
    remark?: string;
    /** 班次 ID；0 = 当天休息 */
    shiftId: number;
    /** 排班状态：1 正常 2 已换班；不传后端默认 1 */
    status?: number;
    /** 区间起（`yyyy-MM-dd`，含） */
    startDate: string;
  }

  /** 排班列表请求（后端 `ScheduleListReq`，分页参数平铺在顶层） */
  export interface ListParams extends PageParams {
    /** 员工档案 ID 精确过滤；不传查全部 */
    employeeId?: number;
    /** 班次 ID 精确过滤（0 = 当天休息）；不传查全部 */
    shiftId?: number;
    /** 状态精确过滤（1 正常 2 已换班）；不传查全部 */
    status?: number;
    /** 排班日起（`yyyy-MM-dd`）；不传不设下限 */
    workDateBegin?: string;
    /** 排班日止（`yyyy-MM-dd`）；不传不设上限 */
    workDateEnd?: string;
  }

  /** 月视图中的一天（后端 `ScheduleMonthDayResp`） */
  export interface MonthCell {
    /** 备注 */
    remark: string;
    /** 班次编码（班次已软删时为空串） */
    shiftCode: string;
    /** 班次 ID；0 = 当天休息或未排班 */
    shiftId: number;
    /** 班次名称（班次已软删时为空串） */
    shiftName: string;
    /** 状态：0 未排班 1 正常 2 已换班（0 是响应侧占位，不落库） */
    status: number;
    /** 日期（`yyyy-MM-dd`） */
    workDate: string;
  }

  /** 月视图中的单个员工（后端 `ScheduleMonthEmployeeResp`） */
  export interface MonthEmployee {
    /** 该月每天的排班（按日期升序，覆盖该月每一天） */
    days: MonthCell[];
    /** 员工档案 ID */
    employeeId: number;
    /** 员工姓名 */
    employeeName: string;
  }

  /** 排班月视图请求（后端 `ScheduleMonthReq`） */
  export interface MonthParams {
    /** 部门 ID（该部门挂载账号的档案）；不传 = 全员（排除离职） */
    deptId?: number;
    /** 月份（`yyyy-MM`） */
    month: string;
  }

  /** 排班月视图响应（后端 `ScheduleMonthResp`）：一行 = 一个员工 */
  export interface MonthGrid {
    /** 员工排班行 */
    employees: MonthEmployee[];
    /** 月份（`yyyy-MM`） */
    month: string;
  }

  /** 排班响应体（后端 `ScheduleResp`） */
  export interface Schedule {
    createdAt: string;
    createdBy: number;
    /** 创建人显示名（后端拼装） */
    createdByName: string;
    /** 员工档案 ID */
    employeeId: number;
    /** 员工姓名（后端拼装） */
    employeeName: string;
    id: number;
    /** 备注 */
    remark: string;
    /** 班次编码（班次已软删时为空串） */
    shiftCode: string;
    /** 班次 ID；0 = 当天休息 */
    shiftId: number;
    /** 班次名称（班次已软删时为空串） */
    shiftName: string;
    /** 状态：1 正常 2 已换班 */
    status: number;
    updatedAt: string;
    updatedBy: number;
    /** 更新人显示名（后端拼装） */
    updatedByName: string;
    /** 排班日期（`yyyy-MM-dd`） */
    workDate: string;
  }

  /** 单日排班 upsert 请求（后端 `UpdateScheduleReq`）：按 `(employeeId, workDate)` 定位，不存在即新建 */
  export interface UpdateParams {
    /** 员工档案 ID */
    employeeId: number;
    /** 备注（上限 255 字符；不传按空串落库） */
    remark?: string;
    /** 班次 ID；0 = 当天休息 */
    shiftId: number;
    /** 排班状态：1 正常 2 已换班 */
    status: number;
    /** 排班日期（`yyyy-MM-dd`） */
    workDate: string;
  }
}

/**
 * 排班列表（分页）：员工 / 班次 / 状态 / 排班日区间过滤
 */
export async function getAttendanceScheduleList(
  params: HrAttendanceScheduleApi.ListParams,
): Promise<PageResult<HrAttendanceScheduleApi.Schedule>> {
  return requestClient.post<PageResult<HrAttendanceScheduleApi.Schedule>>(
    '/hr/attendance/schedule/list',
    params,
  );
}

/**
 * 批量排班（需权限码 hr:attendance-schedule:batch-create）：
 * 员工列表 × 日期区间逐日 upsert，回执给出新建 / 更新行数；
 * 上限：去重后人数 ≤ 1000、区间 ≤ 366 天、人数 × 天数 ≤ 10000 行
 */
export async function batchCreateAttendanceSchedules(
  data: HrAttendanceScheduleApi.BatchCreateParams,
): Promise<HrAttendanceScheduleApi.BatchCreateResult> {
  return requestClient.post<HrAttendanceScheduleApi.BatchCreateResult>(
    '/hr/attendance/schedule/batch-create',
    data,
  );
}

/**
 * 单日排班 upsert（需权限码 hr:attendance-schedule:update）：
 * 按 `(employeeId, workDate)` 定位，不存在即新建（排班表不软删，写入即 upsert）
 */
export async function updateAttendanceSchedule(
  data: HrAttendanceScheduleApi.UpdateParams,
): Promise<HrAttendanceScheduleApi.Schedule> {
  return requestClient.post<HrAttendanceScheduleApi.Schedule>(
    '/hr/attendance/schedule/update',
    data,
  );
}

/**
 * 排班月视图：某月 × 某部门 / 全员，一行 = 一个员工、`days` 覆盖该月每一天；
 * 未排班日以 `status = 0` 占位（不落库），`shiftId = 0` 表示当天休息
 */
export async function getAttendanceScheduleMonth(
  data: HrAttendanceScheduleApi.MonthParams,
): Promise<HrAttendanceScheduleApi.MonthGrid> {
  return requestClient.post<HrAttendanceScheduleApi.MonthGrid>(
    '/hr/attendance/schedule/month',
    data,
  );
}
