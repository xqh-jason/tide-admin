import type { IdRequest, PageParams, PageResult } from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 额度发放（后端域 `biz/hr/time-off` 的 `grant` 段，即额度账本的**授予批次**）。
 *
 * 契约要点（对齐后端 `TimeOffGrantListReq` / `BatchCreateGrantReq` /
 * `BatchCreateGrantResp` / `TimeOffGrantResp`）：
 * - **批次是额度的事实来源**：员工的可用额度 = 各有效批次的 `remainingMinutes` 之和，
 *   `minutes` 是授予总数、`remainingMinutes` 是剩余可用；撤销 / 扣减都会回写批次并留流水；
 * - `cancel` 是**作废批次**（后端事务内：账户 `granted` 回冲 + 批次剩余归零 +
 *   状态置 4 已撤销 + 反向流水），只允许撤销 `status = 1 有效` 的批次，
 *   已用尽 / 已失效的批次后端直接拒绝；
 * - `sourceKind`（来源对象类型）：0 无来源（HR 发放 / 手工调整）/ 1 系统任务 /
 *   2 请假单 / 3 加班单 / 4 手工操作，`sourceId` 配合它追溯来源单据；
 * - `reason` 取自字典 `timeOffGrantReason`，且是**幂等键**的一部分：
 *   同一「员工 × 假期类型 × 发放依据 × 归属周期」重复发放会被后端跳过（`skipped`）；
 * - `period` 是归属周期（如 `2026`，幂等键之一）；`effectiveAt` / `expireAt` 是
 *   `yyyy-MM-dd` 日期字符串，`expireAt` 为空 = 永久有效，且不得早于 `effectiveAt`；
 * - 全部端点 `POST + JSON body`；详情 / 撤销只收 `{ id }`。
 */
export namespace HrTimeOffGrantApi {
  /** 额度批次（对齐后端 `TimeOffGrantResp`；追加型表，无 `updatedAt`） */
  export interface Grant {
    /** 创建时间（`yyyy-MM-dd HH:mm:ss`），列表按它排序 */
    createdAt: string;
    /** 创建人 sys_user.id */
    createdBy: number;
    /** 创建人显示名（后端批量拼装） */
    createdByName: string;
    /** 员工档案 ID */
    employeeId: number;
    /** 员工姓名（后端批量拼装） */
    employeeName: string;
    /** 生效日期（`yyyy-MM-dd`） */
    effectiveAt: string;
    /** 失效日期（`yyyy-MM-dd`）；null = 永久有效 */
    expireAt: null | string;
    id: number;
    /** 授予分钟数（恒正） */
    minutes: number;
    /** 归属周期（如 2026） */
    period: string;
    /** 发放依据（字典 timeOffGrantReason） */
    reason: string;
    /** 剩余可用分钟数 */
    remainingMinutes: number;
    /** 备注 */
    remark: string;
    /** 来源：1 发放 / 2 手工调整 / 3 加班转调休 */
    source: number;
    /** 来源对象 ID（配合 sourceKind 追溯；0 = 无） */
    sourceId: number;
    /** 来源对象类型：0 无 / 1 系统任务 / 2 请假单 / 3 加班单 / 4 手工 */
    sourceKind: number;
    /** 状态：1 有效 / 2 已用尽 / 3 已失效 / 4 已撤销 */
    status: number;
    /** 假期类型 ID */
    timeOffTypeId: number;
    /** 假期类型名称（后端批量拼装） */
    timeOffTypeName: string;
    /** 更新人 sys_user.id */
    updatedBy: number;
    /** 更新人显示名（后端批量拼装） */
    updatedByName: string;
  }

  /** 列表请求（对齐 `TimeOffGrantListReq`） */
  export interface ListParams extends PageParams {
    /** 员工档案 ID 精确过滤；不传查全部 */
    employeeId?: number;
    /** 归属周期精确过滤（如 2026）；不传查全部 */
    period?: string;
    /** 发放依据模糊搜索（字典 timeOffGrantReason）；不传查全部 */
    reason?: string;
    /** 状态精确过滤（1 有效 / 2 已用尽 / 3 已失效 / 4 已撤销）；不传查全部 */
    status?: number;
    /** 假期类型 ID 精确过滤；不传查全部 */
    timeOffTypeId?: number;
  }

  /**
   * 批量发放参数（对齐 `BatchCreateGrantReq`）。
   * 发放范围**三选一**（后端 `validate.rs` 强校验，`all` 与显式范围同时给出即报错）：
   * `employeeIds` 非空 / `deptId` 非 null / `all = true`。
   */
  export interface BatchCreateParams {
    /** 是否全员发放（范围之一）：展开为全部员工档案中非离职者 */
    all?: boolean;
    /**
     * 指定部门 ID（范围之一）：仅该部门**直属挂载**的员工（后端按 `sys_user_dept`
     * 精确匹配 deptId，不含子部门）
     */
    deptId?: null | number;
    /** 指定员工档案 ID 列表（范围之一），单次上限 1000 人 */
    employeeIds?: number[];
    /** 生效日期（`yyyy-MM-dd`） */
    effectiveAt: string;
    /** 失效日期（`yyyy-MM-dd`）；null / 省略 = 永久有效 */
    expireAt?: null | string;
    /** 每人发放分钟数（恒正） */
    minutes: number;
    /** 归属周期（如 2026，幂等键之一） */
    period: string;
    /** 发放依据（字典 timeOffGrantReason，幂等键之一） */
    reason: string;
    /** 备注 */
    remark: string;
    /** 假期类型 ID */
    timeOffTypeId: number;
  }

  /** 批量发放结果（对齐 `BatchCreateGrantResp`）：命中幂等键的员工计入 skipped */
  export interface BatchCreateResult {
    /** 新建批次的员工数 */
    created: number;
    /** 因幂等键已存在被跳过的员工数 */
    skipped: number;
    /** 被跳过的员工档案 ID 列表 */
    skippedEmployeeIds: number[];
  }
}

/** 额度批次列表（分页；员工 / 假期类型 / 状态 / 归属周期精确过滤，发放依据模糊匹配） */
export async function getTimeOffGrantList(
  params: HrTimeOffGrantApi.ListParams,
): Promise<PageResult<HrTimeOffGrantApi.Grant>> {
  return requestClient.post<PageResult<HrTimeOffGrantApi.Grant>>(
    '/hr/time-off/grant/list',
    params,
  );
}

/** 额度批次详情（含后端拼装的员工 / 假期类型名称） */
export async function getTimeOffGrant(
  id: number,
): Promise<HrTimeOffGrantApi.Grant> {
  return requestClient.post<HrTimeOffGrantApi.Grant>('/hr/time-off/grant/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 批量发放额度（需权限码 hr:time-off-grant:create）。
 * 后端逐员工按「员工 × 假期类型 × 发放依据 × 归属周期」幂等：已发过的计入
 * `skipped` / `skippedEmployeeIds`（不算失败），其余新建批次并同步账户额度
 */
export async function batchCreateTimeOffGrants(
  data: HrTimeOffGrantApi.BatchCreateParams,
): Promise<HrTimeOffGrantApi.BatchCreateResult> {
  return requestClient.post<HrTimeOffGrantApi.BatchCreateResult>(
    '/hr/time-off/grant/batch-create',
    data,
  );
}

/**
 * 撤销额度批次（需权限码 hr:time-off-grant:cancel）：作废批次并回冲账户额度、
 * 写反向流水；**仅 `status = 1 有效` 的批次可撤销**，已用尽 / 已失效的后端拒绝
 */
export async function cancelTimeOffGrant(id: number) {
  return requestClient.post<null>('/hr/time-off/grant/cancel', {
    id,
  } satisfies IdRequest);
}
