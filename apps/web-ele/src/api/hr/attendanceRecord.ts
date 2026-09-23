import type { IdRequest, PageParams, PageResult } from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 出勤记录（对齐后端 `modules/biz/hr/attendance` 的 `Record*` DTO）。
 *
 * 契约要点：
 * - `hr_attendance_record` 是**事实表、不软删**：写入一律走「按
 *   `(employeeId, workDate)` / `(source, externalId)` upsert」；
 * - `POST /hr/attendance/record/import` 是第三方考勤平台（钉钉 / 飞书 / 设备）的**接入面**：
 *   请求体是「归一化后的行数组」，适配层只需把各家字段映射成 `ImportRow`，服务端负责
 *   按员工当日班次窗口回算迟到 / 早退 / 实际出勤 / 缺卡；
 * - `externalId` 传**空串按「无外部 ID」处理**（落 NULL）；配合 `source` 判重，
 *   同一 `(source, externalId)` 重复导入即覆盖更新，不会被当成新事实；
 * - `update` 的 `clockIn` / `clockOut` 是三态：**不传 = 不改、空串 = 清空、传值 = 覆盖**，
 *   服务端会按「打卡时间 vs 当日班次窗口」重算派生字段并刷新班次快照。
 */
export namespace HrAttendanceRecordApi {
  /** 导入错误明细（后端 `ImportRecordError`）：单行失败不打断整批 */
  export interface ImportError {
    /** 失败原因（后端中文文案） */
    message: string;
    /** 行号（从 1 开始，对应 rows 下标 + 1） */
    row: number;
  }

  /** 出勤事实导入请求（后端 `ImportRecordReq`） */
  export interface ImportParams {
    /** 归一化后的导入行 */
    rows: ImportRow[];
  }

  /** 出勤事实导入回执（后端 `ImportRecordResp`） */
  export interface ImportResult {
    /** 新建的事实行数 */
    created: number;
    /** 逐行错误明细（`skipped` 行也在此列出原因） */
    errors: ImportError[];
    /** 因外部记录 ID 冲突而整行跳过的行数 */
    skipped: number;
    /** 覆盖更新的事实行数 */
    updated: number;
  }

  /**
   * 导入行（后端 `ImportRecordRow`）：`employeeId` / `userId` 二选一
   * （`userId` 由服务端反查档案），其余为归一化后的打卡事实
   */
  export interface ImportRow {
    /** 上班打卡时间（`yyyy-MM-dd HH:mm:ss`） */
    clockIn?: null | string;
    /** 下班打卡时间（`yyyy-MM-dd HH:mm:ss`） */
    clockOut?: null | string;
    /** 员工档案 ID（与 userId 二选一） */
    employeeId?: null | number;
    /** 第三方平台的记录 ID（配合 source 判重；空串按「无外部 ID」处理） */
    externalId?: null | string;
    /** 备注 */
    remark?: string;
    /** 数据来源：1 导入 2 手工补录 3 设备 4 钉钉 5 飞书 */
    source: number;
    /** 平台用户 ID（与 employeeId 二选一，服务端反查档案） */
    userId?: null | number;
    /** 出勤日期（`yyyy-MM-dd`） */
    workDate: string;
  }

  /** 出勤事实列表请求（后端 `RecordListReq`，分页参数平铺在顶层） */
  export interface ListParams extends PageParams {
    /** 员工档案 ID 精确过滤；不传查全部 */
    employeeId?: number;
    /** 缺卡情况精确过滤（0 无 1 缺上班卡 2 缺下班卡 3 都缺）；不传查全部 */
    missClock?: number;
    /** 数据来源精确过滤（1 导入 2 手工补录 3 设备 4 钉钉 5 飞书）；不传查全部 */
    source?: number;
    /** 出勤日起（`yyyy-MM-dd`）；不传不设下限 */
    workDateBegin?: string;
    /** 出勤日止（`yyyy-MM-dd`）；不传不设上限 */
    workDateEnd?: string;
  }

  /** 出勤事实响应体（后端 `RecordResp`） */
  export interface Record {
    /** 实际出勤分钟数（服务端按班次窗口回算） */
    actualMinutes: number;
    /** 上班打卡时间（`yyyy-MM-dd HH:mm:ss`），未打卡为 null */
    clockIn: null | string;
    /** 下班打卡时间（`yyyy-MM-dd HH:mm:ss`），未打卡为 null */
    clockOut: null | string;
    createdAt: string;
    createdBy: number;
    /** 创建人显示名（后端拼装） */
    createdByName: string;
    /** 早退分钟数 */
    earlyLeaveMinutes: number;
    /** 员工档案 ID */
    employeeId: number;
    /** 员工姓名（后端拼装） */
    employeeName: string;
    /** 第三方平台的记录 ID；本地补录为 null */
    externalId: null | string;
    id: number;
    /** 迟到分钟数 */
    lateMinutes: number;
    /** 缺卡：0 无 1 缺上班卡 2 缺下班卡 3 上下班卡都缺 */
    missClock: number;
    /** 备注 */
    remark: string;
    /** 班次编码（班次已软删时为空串） */
    shiftCode: string;
    /** 班次 ID 快照；0 = 当天休息 */
    shiftId: number;
    /** 班次名称（班次已软删时为空串） */
    shiftName: string;
    /** 数据来源：1 导入 2 手工补录 3 设备 4 钉钉 5 飞书 */
    source: number;
    updatedAt: string;
    updatedBy: number;
    /** 更新人显示名（后端拼装） */
    updatedByName: string;
    /** 出勤日期（`yyyy-MM-dd`） */
    workDate: string;
  }

  /**
   * 手工补录 / 修正出勤事实请求（后端 `UpdateRecordReq`）：
   * `clockIn` / `clockOut` 三态——不传 = 保持原值、空串 = 清空、传值 = 覆盖
   */
  export interface UpdateParams {
    /** 上班打卡时间（`yyyy-MM-dd HH:mm:ss`；空串 = 清空，不传 = 不改） */
    clockIn?: string;
    /** 下班打卡时间（`yyyy-MM-dd HH:mm:ss`；空串 = 清空，不传 = 不改） */
    clockOut?: string;
    /** 出勤事实主键 */
    id: number;
    /** 备注；不传 = 不改 */
    remark?: string;
  }
}

/**
 * 出勤事实列表（分页）：员工 / 来源 / 缺卡 / 出勤日区间过滤
 */
export async function getAttendanceRecordList(
  params: HrAttendanceRecordApi.ListParams,
): Promise<PageResult<HrAttendanceRecordApi.Record>> {
  return requestClient.post<PageResult<HrAttendanceRecordApi.Record>>(
    '/hr/attendance/record/list',
    params,
  );
}

/**
 * 出勤事实详情（按主键查一条，补录抽屉回显用）
 */
export async function getAttendanceRecord(
  id: number,
): Promise<HrAttendanceRecordApi.Record> {
  return requestClient.post<HrAttendanceRecordApi.Record>(
    '/hr/attendance/record/get',
    { id } satisfies IdRequest,
  );
}

/**
 * 手工补录 / 修正出勤事实（需权限码 hr:attendance-record:update）：
 * `clockIn` / `clockOut` 三态（不传 = 不改、空串 = 清空、传值 = 覆盖），
 * 服务端按「打卡时间 vs 当日班次窗口」重算迟到 / 早退 / 实际出勤 / 缺卡
 */
export async function updateAttendanceRecord(
  data: HrAttendanceRecordApi.UpdateParams,
): Promise<HrAttendanceRecordApi.Record> {
  return requestClient.post<HrAttendanceRecordApi.Record>(
    '/hr/attendance/record/update',
    data,
  );
}

/**
 * 导入归一化出勤事实（需权限码 hr:attendance-record:import）：
 * 第三方考勤平台对接面，`externalId` 空串按「无外部 ID」处理（落 NULL）；
 * 单行失败不打断整批，逐行错误随回执返回
 */
export async function importAttendanceRecords(
  data: HrAttendanceRecordApi.ImportParams,
): Promise<HrAttendanceRecordApi.ImportResult> {
  return requestClient.post<HrAttendanceRecordApi.ImportResult>(
    '/hr/attendance/record/import',
    data,
  );
}
