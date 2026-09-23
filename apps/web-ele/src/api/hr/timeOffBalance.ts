import type { IdRequest, PageParams, PageResult } from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 假期额度账户与流水（后端域 `biz/hr/time_off` 的 balance 段，只读端点）。
 *
 * 契约要点（对齐后端 `TimeOffBalanceListReq` / `TimeOffBalanceResp` /
 * `TimeOffBalanceLogListReq` / `TimeOffBalanceLogResp`）：
 * - 金额单位一律**分钟**（`i32`/`i64`），「天 ↔ 分钟」换算由前端按假别
 *   `unit` / `minUnitMinutes` 决定，本文件的展示统一走 `formatMinutes`；
 * - `availableMinutes` 由后端计算：授予 + 调整 − 实扣 − 预占 − 失效；
 * - **账户响应无 `createdAt`**（只有 `updatedAt`），列表请求也**没有审计过滤字段**
 *   （仅 `employeeId` / `timeOffTypeId` / `period`），故本域不用审计搜索项与审计列；
 * - 流水表是 append-only 对账凭据：无 `createdAt`/`updatedAt` 审计对，唯一的人字段是
 *   `operatorId`（`0` = 系统）；`deltaMinutes` 正加负减，来源键 `sourceId` 记来源单据 /
 *   批次 ID（请假单预占 / 实扣 / 释放时即**审批实例 ID**，改单重提会换一轮实例；
 *   `sourceKind = 0` 时表示账户级操作，无来源单据）。
 */
export namespace HrTimeOffBalanceApi {
  /** 额度账户聚合展示行（对齐后端 `TimeOffBalanceResp`） */
  export interface Balance {
    /** 手工调整净额（可负） */
    adjustMinutes: number;
    /** 可用分钟数 = 授予 + 调整 − 实扣 − 预占 − 失效（后端计算） */
    availableMinutes: number;
    /** 创建人 sys_user.id */
    createdBy: number;
    /** 创建人显示名（后端拼装） */
    createdByName: string;
    /** 员工档案 ID */
    employeeId: number;
    /** 员工姓名（后端拼装） */
    employeeName: string;
    /** 累计失效作废 */
    expiredMinutes: number;
    /** 累计授予 */
    grantedMinutes: number;
    id: number;
    /** 审批中预占 */
    lockedMinutes: number;
    /** 账期（自然年，如 2026） */
    period: string;
    /** 假期类型 ID */
    timeOffTypeId: number;
    /** 假期类型名称（后端拼装） */
    timeOffTypeName: string;
    /** 更新时间（`yyyy-MM-dd HH:mm:ss`） */
    updatedAt: string;
    /** 更新人 sys_user.id */
    updatedBy: number;
    /** 更新人显示名（后端拼装） */
    updatedByName: string;
    /** 累计实扣 */
    usedMinutes: number;
  }

  /**
   * 额度流水（对齐后端 `TimeOffBalanceLogResp`，append-only 对账凭据）。
   * 业务类型见 `hr_time_off/mod.rs`：1 授予 / 2 手工调整 / 3 请假预占 /
   * 4 审批实扣 / 5 驳回释放 / 6 过期作废。
   */
  export interface BalanceLog {
    /** 变动后可用余额 */
    afterMinutes: number;
    /** 变动前可用余额 */
    beforeMinutes: number;
    /** 业务类型：1 授予 / 2 手工调整 / 3 请假预占 / 4 审批实扣 / 5 驳回释放 / 6 过期作废 */
    bizType: number;
    /** 创建时间（`yyyy-MM-dd HH:mm:ss`） */
    createdAt: string;
    /** 变动分钟数（正加负减） */
    deltaMinutes: number;
    /** 员工档案 ID */
    employeeId: number;
    /** 员工姓名（后端拼装） */
    employeeName: string;
    /** 授予批次 ID；0 = 账户级操作 */
    grantId: number;
    id: number;
    /** 操作人 sys_user.id；0 = 系统 */
    operatorId: number;
    /** 操作人显示名（后端拼装；系统操作人为空串） */
    operatorName: string;
    /** 备注 */
    remark: string;
    /** 来源类型：0 无 / 1 系统任务 / 2 请假单 / 3 加班单 / 4 手工 */
    sourceKind: number;
    /** 来源单据 / 批次 ID（请假单预占/实扣/释放时为审批实例 ID） */
    sourceId: number;
    /** 假期类型 ID */
    timeOffTypeId: number;
    /** 假期类型名称（后端拼装） */
    timeOffTypeName: string;
  }

  /** 额度账户列表请求（管理视角：按员工 / 假别 / 账期过滤） */
  export interface ListParams extends PageParams {
    /** 员工档案 ID 精确过滤；不传查全部 */
    employeeId?: number;
    /** 账期精确过滤（自然年，如 2026）；不传查全部 */
    period?: string;
    /** 假期类型 ID 精确过滤；不传查全部 */
    timeOffTypeId?: number;
  }

  /** 额度流水列表请求（按员工 / 假别 / 业务类型过滤） */
  export interface LogParams extends PageParams {
    /** 业务类型精确过滤（1 授予 / 2 手工调整 / 3 请假预占 / 4 审批实扣 / 5 驳回释放 / 6 过期作废） */
    bizType?: number;
    /** 员工档案 ID 精确过滤；不传查全部 */
    employeeId?: number;
    /** 假期类型 ID 精确过滤；不传查全部 */
    timeOffTypeId?: number;
  }
}

/**
 * 额度账户列表（分页，只读）
 */
export async function getTimeOffBalanceList(
  params: HrTimeOffBalanceApi.ListParams,
): Promise<PageResult<HrTimeOffBalanceApi.Balance>> {
  return requestClient.post<PageResult<HrTimeOffBalanceApi.Balance>>(
    '/hr/time-off/balance/list',
    params,
  );
}

/**
 * 额度账户详情（只读；账户软删视为不存在，报业务错误）
 */
export async function getTimeOffBalance(
  id: number,
): Promise<HrTimeOffBalanceApi.Balance> {
  return requestClient.post<HrTimeOffBalanceApi.Balance>(
    '/hr/time-off/balance/get',
    { id } satisfies IdRequest,
  );
}

/**
 * 额度流水查询（分页，只读；append-only 对账凭据，无更新语义）
 */
export async function getTimeOffBalanceLogs(
  params: HrTimeOffBalanceApi.LogParams,
): Promise<PageResult<HrTimeOffBalanceApi.BalanceLog>> {
  return requestClient.post<PageResult<HrTimeOffBalanceApi.BalanceLog>>(
    '/hr/time-off/balance/logs',
    params,
  );
}
