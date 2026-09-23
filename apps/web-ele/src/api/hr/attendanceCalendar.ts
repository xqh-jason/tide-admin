import type { AuditFields, PageParams, PageResult } from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 工作日历（考勤域，`hr_work_calendar`）。
 *
 * 契约要点（对齐后端 `dto.rs` 的 `UpsertCalendarReq` / `BatchImportCalendarReq` / `CalendarResp`）：
 * - `calendarDate` 是**唯一键**（`yyyy-MM-dd`），写入一律走 upsert：
 *   单日 `upsert`、区间 `batch-import` 都是「存在即更新、不存在即新建」，**不软删**；
 * - `holidayType` 值域来自 `modules/biz/hr/attendance/mod.rs` 的 `HOLIDAY_TYPES`：
 *   0 普通 / 1 法定节假日 / 2 调休上班；`isWorkday` 是独立的 1 是 / 0 否 标志
 *   （调休上班 = `isWorkday 1 + holidayType 2`，法定节假日 = `isWorkday 0 + holidayType 1`）；
 * - `standardMinutes` 是该日标准工时（分钟，> 0 且 ≤ 1440，默认 480）：
 *   当日既无排班又无排班窗口时，应出勤按该值折算；
 * - 区间导入单次跨度上限 366 天（跨自然日，含两端），超限后端拒绝。
 */
export namespace HrAttendanceCalendarApi {
  /** 工作日历日（对齐后端 `CalendarResp`） */
  export interface Calendar extends AuditFields {
    /** 日期（`yyyy-MM-dd`，唯一键） */
    calendarDate: string;
    /** 创建人 ID（sys_user.id） */
    createdBy?: number;
    /** 日期类型：0 普通 1 法定节假日 2 调休上班 */
    holidayType: number;
    id: number;
    /** 是否工作日：1 是 0 否 */
    isWorkday: number;
    /** 备注（如「国庆节」） */
    remark: string;
    /** 该日标准工时（分钟） */
    standardMinutes: number;
    /** 更新人 ID（sys_user.id） */
    updatedBy?: number;
  }

  /** 工作日历列表请求（后端 `CalendarListReq`）：分页平铺 + 工作日 / 类型 / 日期区间过滤 */
  export interface ListParams extends PageParams {
    /** 日期起（`yyyy-MM-dd`）；不传不设下限 */
    dateBegin?: string;
    /** 日期止（`yyyy-MM-dd`）；不传不设上限 */
    dateEnd?: string;
    /** 日期类型精确过滤（0 普通 1 法定节假日 2 调休上班）；不传查全部 */
    holidayType?: number;
    /** 是否工作日精确过滤：1 是 0 否；不传查全部 */
    isWorkday?: number;
  }

  /** 单日 upsert 请求（后端 `UpsertCalendarReq`）：按 `calendarDate` 唯一键定位 */
  export interface UpsertParams {
    /** 日期（`yyyy-MM-dd`，唯一键） */
    calendarDate: string;
    /** 日期类型：0 普通 1 法定节假日 2 调休上班 */
    holidayType: number;
    /** 是否工作日：1 是 0 否 */
    isWorkday: number;
    /** 备注（≤ 255 字符，空串表示无） */
    remark?: string;
    /** 该日标准工时（分钟，> 0 且 ≤ 1440） */
    standardMinutes: number;
  }

  /** 区间导入请求（后端 `BatchImportCalendarReq`）：日期区间 × 工作日 / 类型，逐日 upsert */
  export interface BatchImportParams {
    /** 区间止（`yyyy-MM-dd`，含；跨度含两端不超过 366 天） */
    endDate: string;
    /** 日期类型：0 普通 1 法定节假日 2 调休上班 */
    holidayType: number;
    /** 是否工作日：1 是 0 否 */
    isWorkday: number;
    /** 备注（逐日写入同一备注，≤ 255 字符） */
    remark?: string;
    /** 该日标准工时（分钟，> 0 且 ≤ 1440） */
    standardMinutes: number;
    /** 区间起（`yyyy-MM-dd`，含） */
    startDate: string;
  }

  /** 区间导入回执（后端 `BatchImportCalendarResp`）：新建 / 更新天数 */
  export interface BatchImportResult {
    /** 新建的日历天数 */
    created: number;
    /** 更新的日历天数（区间内已存在、被覆盖的天数） */
    updated: number;
  }
}

/**
 * 工作日历列表（分页；日期区间 / 工作日 / 类型过滤，按日期倒序）
 */
export async function getAttendanceCalendarList(
  params: HrAttendanceCalendarApi.ListParams,
): Promise<PageResult<HrAttendanceCalendarApi.Calendar>> {
  return requestClient.post<PageResult<HrAttendanceCalendarApi.Calendar>>(
    '/hr/attendance/calendar/list',
    params,
  );
}

/**
 * 单日工作日历 upsert（需权限码 hr:attendance-calendar:upsert）：
 * `calendarDate` 唯一，已存在的日期被覆盖更新，**不会软删也不会报重复**
 */
export async function upsertAttendanceCalendar(
  data: HrAttendanceCalendarApi.UpsertParams,
): Promise<HrAttendanceCalendarApi.Calendar> {
  return requestClient.post<HrAttendanceCalendarApi.Calendar>(
    '/hr/attendance/calendar/upsert',
    data,
  );
}

/**
 * 区间工作日历导入（需权限码 hr:attendance-calendar:batch-import）：
 * 区间逐日 upsert（存在即更新、不存在即新建），回执带回新建 / 更新天数
 */
export async function batchImportAttendanceCalendars(
  data: HrAttendanceCalendarApi.BatchImportParams,
): Promise<HrAttendanceCalendarApi.BatchImportResult> {
  return requestClient.post<HrAttendanceCalendarApi.BatchImportResult>(
    '/hr/attendance/calendar/batch-import',
    data,
  );
}
