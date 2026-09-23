import type { IdRequest, PageParams, PageResult } from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 请假单（后端域 `biz/hr/time_off` 的 request 段）。
 *
 * 契约要点（对齐后端 `TimeOffRequestListReq` / `MineTimeOffRequestReq` /
 * `CreateTimeOffRequestReq` / `UpdateTimeOffRequestReq` / `TimeOffRequestResp`）：
 * - **建单即提交**：`create` 在同一个事务里落库 + 预占额度 + 起审批实例，
 *   单据初始状态就是「审批中」；
 * - **请求体刻意不接受 `durationMinutes`**：时长由后端按「排班 × 工作日历」派生
 *   （防伪造），前端只提交起止时间；
 * - **写操作全部要求「单据归属 = 本人」**：`update` / `submit` / `cancel` / `delete`
 *   在 service 内先 `ensure_request_owner`（对比员工档案的 `userId` 与登录用户），
 *   HR 视角代他人操作必被拒；故 `views/biz/hr/time-off/request` 页面**只读**；
 * - 状态机（`hr_time_off/mod.rs`）：1 审批中 / 2 已通过 / 3 已驳回 / 4 已撤销；
 *   `update` 与 `submit` 仅「已驳回 / 已撤销」可调，`cancel` 仅「审批中」可调，
 *   `delete` 为软删且「审批中」需先撤销；
 * - `approvalInstanceId = 0` 表示无审批实例（本域建单即提交，正常路径下恒有值）；
 *   每轮「驳回 → 改 → 重提」都会新建实例，故预占 / 实扣 / 释放流水的 `sourceId`
 *   记的是**那一轮的审批实例 ID**。
 */
export namespace HrTimeOffRequestApi {
  /** 请假单（对齐后端 `TimeOffRequestResp`） */
  export interface TimeOffRequest {
    /** 审批实例 ID；0 = 无 */
    approvalInstanceId: number;
    /** 附件 ID（sys_file.id；0 = 无） */
    attachmentId: number;
    /** 创建时间（`yyyy-MM-dd HH:mm:ss`） */
    createdAt: string;
    /** 创建人 sys_user.id */
    createdBy: number;
    /** 创建人显示名（后端拼装） */
    createdByName: string;
    /** 请假分钟数（后端按排班 × 工作日历派生，请求体不接受） */
    durationMinutes: number;
    /** 员工档案 ID */
    employeeId: number;
    /** 员工显示名（后端拼装） */
    employeeName: string;
    /** 请假结束时间（`yyyy-MM-dd HH:mm:ss`） */
    endAt: string;
    id: number;
    /** 请假事由 */
    reason: string;
    /** 备注 */
    remark: string;
    /** 请假开始时间（`yyyy-MM-dd HH:mm:ss`） */
    startAt: string;
    /** 状态：1 审批中 / 2 已通过 / 3 已驳回 / 4 已撤销 */
    status: number;
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
  }

  /** 请假单列表请求（HR 管理视角：按员工 / 假别 / 状态 / 开始时间范围过滤） */
  export interface ListParams extends PageParams {
    /** 员工档案 ID 精确过滤；不传查全部 */
    employeeId?: number;
    /** 请假开始时间范围起（`yyyy-MM-dd` 或 `yyyy-MM-dd HH:mm:ss`） */
    startAtBegin?: string;
    /** 请假开始时间范围止 */
    startAtEnd?: string;
    /** 状态精确过滤（1/2/3/4）；不传查全部 */
    status?: number;
    /** 假期类型 ID 精确过滤；不传查全部 */
    timeOffTypeId?: number;
  }

  /**
   * 我的请假单请求：员工身份由登录用户推导，**不收 `employeeId`**
   * （后端按登录用户关联的档案过滤）
   */
  export interface MineParams extends PageParams {
    /** 状态精确过滤（1/2/3/4）；不传查全部 */
    status?: number;
  }

  /**
   * 创建请假单请求（建单即提交）。
   * `employeeId` 必须是**本人**档案 ID（`resolveMyEmployee()`），
   * 且**不得**传 `durationMinutes`（后端派生）。
   */
  export interface CreateParams {
    /** 附件 ID（sys_file.id；0 = 无附件）。假别 `requireAttachment = 1` 时后端强制要求非 0 */
    attachmentId?: number;
    /** 员工档案 ID（必须是本人） */
    employeeId: number;
    /** 请假结束时间（`yyyy-MM-dd HH:mm:ss`，须晚于开始时间） */
    endAt: string;
    /** 请假事由（trim 后非空，≤ 255 字符） */
    reason: string;
    /** 备注（≤ 255 字符） */
    remark?: string;
    /** 请假开始时间（`yyyy-MM-dd HH:mm:ss`） */
    startAt: string;
    /** 假期类型 ID */
    timeOffTypeId: number;
  }

  /**
   * 修改请假单请求（仅「已驳回 / 已撤销」可改，改完需重新提交）。
   * 请求体同样不接受 `durationMinutes`
   */
  export interface UpdateParams {
    /** 附件 ID（sys_file.id；0 = 无附件） */
    attachmentId?: number;
    /** 请假结束时间（`yyyy-MM-dd HH:mm:ss`） */
    endAt: string;
    /** 请假单主键 */
    id: number;
    /** 请假事由 */
    reason: string;
    /** 备注 */
    remark?: string;
    /** 请假开始时间（`yyyy-MM-dd HH:mm:ss`） */
    startAt: string;
    /** 假期类型 ID */
    timeOffTypeId: number;
  }
}

/**
 * 请假单列表（需登录态；HR 管理视角只读列表）
 */
export async function getTimeOffRequestList(
  params: HrTimeOffRequestApi.ListParams,
): Promise<PageResult<HrTimeOffRequestApi.TimeOffRequest>> {
  return requestClient.post<PageResult<HrTimeOffRequestApi.TimeOffRequest>>(
    '/hr/time-off/request/list',
    params,
  );
}

/**
 * 我的请假单（后端按登录用户关联的员工档案过滤，不收 `employeeId`）
 */
export async function getMyTimeOffRequestList(
  params: HrTimeOffRequestApi.MineParams,
): Promise<PageResult<HrTimeOffRequestApi.TimeOffRequest>> {
  return requestClient.post<PageResult<HrTimeOffRequestApi.TimeOffRequest>>(
    '/hr/time-off/request/mine',
    params,
  );
}

/** 请假单详情 */
export async function getTimeOffRequest(
  id: number,
): Promise<HrTimeOffRequestApi.TimeOffRequest> {
  return requestClient.post<HrTimeOffRequestApi.TimeOffRequest>(
    '/hr/time-off/request/get',
    { id } satisfies IdRequest,
  );
}

/**
 * 创建请假单（需权限码 hr:time-off-request:create）：
 * 建单即提交——同一事务内落库 + 预占额度 + 起审批实例，返回「审批中」单据
 */
export async function createTimeOffRequest(
  data: HrTimeOffRequestApi.CreateParams,
): Promise<HrTimeOffRequestApi.TimeOffRequest> {
  return requestClient.post<HrTimeOffRequestApi.TimeOffRequest>(
    '/hr/time-off/request/create',
    data,
  );
}

/**
 * 修改请假单（需权限码 hr:time-off-request:update）：
 * 仅「已驳回 / 已撤销」且归属本人的单据可改，改完需重新提交
 */
export async function updateTimeOffRequest(
  data: HrTimeOffRequestApi.UpdateParams,
): Promise<HrTimeOffRequestApi.TimeOffRequest> {
  return requestClient.post<HrTimeOffRequestApi.TimeOffRequest>(
    '/hr/time-off/request/update',
    data,
  );
}

/**
 * 删除请假单（软删，需权限码 hr:time-off-request:delete）：
 * 仅归属本人可删，「审批中」需先撤销
 */
export async function deleteTimeOffRequest(id: number) {
  return requestClient.post<null>('/hr/time-off/request/delete', {
    id,
  } satisfies IdRequest);
}

/**
 * 重新提交请假单（需权限码 hr:time-off-request:submit）：
 * 仅「已驳回 / 已撤销」且归属本人可提交；后端重新派生时长、预占额度并起**新**实例
 */
export async function submitTimeOffRequest(
  id: number,
): Promise<HrTimeOffRequestApi.TimeOffRequest> {
  return requestClient.post<HrTimeOffRequestApi.TimeOffRequest>(
    '/hr/time-off/request/submit',
    { id } satisfies IdRequest,
  );
}

/**
 * 撤销请假单（需权限码 hr:time-off-request:cancel）：
 * 只有申请人本人、且「审批中」可撤销；审批侧终态分派会把预占额度释放回账户
 */
export async function cancelTimeOffRequest(
  id: number,
): Promise<HrTimeOffRequestApi.TimeOffRequest> {
  return requestClient.post<HrTimeOffRequestApi.TimeOffRequest>(
    '/hr/time-off/request/cancel',
    { id } satisfies IdRequest,
  );
}
