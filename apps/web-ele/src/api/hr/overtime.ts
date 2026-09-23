import type { IdRequest, PageParams, PageResult } from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 加班申请（后端域 `biz/hr/overtime`，端点前缀 `/hr/overtime`）。
 *
 * 契约要点（对齐后端 `dto.rs` / `mod.rs` / `service.rs`）：
 * - **时长不裁剪**：`durationMinutes` 一律由后端按 `endAt − startAt` 的分钟总数派生
 *   （加班本就发生在班次窗口之外），请求体**永不传**时长、状态与审计字段；
 * - **类型必须与应出勤日匹配**（应出勤与否由考勤域按「排班 × 工作日历」实时派生）：
 *   `1 工作日` 要求当日是应出勤日**且**区间落在应工作窗口之外（与窗口相交后端拒绝）；
 *   `2 休息日` / `3 法定节假日` 要求当日**不是**应出勤日；
 * - **起止时间必须落在 `workDate` 当天**（跨天加班拆成多条单据）；
 * - **同日区间不重叠**：同一员工同一 `workDate` 的在途（审批中）或已通过单据区间不得相交
 *   （只比对已通过的单据时，两张相交的在途单各自通过后会对同一时段重复补偿）；
 * - **建单即提交**：`create` 同事务起审批实例（无草稿态）；`update` / `submit` 仅
 *   「已驳回 / 已撤销」可用，`cancel` 仅「审批中」可用；`delete` 软删（审批中的单据
 *   先撤在途实例）；
 * - **写入口一律「本人」**：`employeeId` 必须是当前登录账号关联的员工档案，
 *   代他人建单 / 改单 / 撤单后端一律拒绝（本文件只做契约声明，不做归属校验）；
 * - `compMode = 1 转调休`：审批通过后**同事务**生成调休批次（`sourceKind = 3`、
 *   `sourceId = 本单 ID` 幂等），调休自 `workDate` 起 **3 个自然月**内有效
 *   （按月进位，月末不足取当月最后一天）；`compMode = 2 计加班费` 只落单据状态。
 *
 * 时间字段格式：`workDate` 为 `yyyy-MM-dd`，`startAt` / `endAt` / `createdAt` /
 * `updatedAt` 为 `yyyy-MM-dd HH:mm:ss`。
 */
export namespace HrOvertimeApi {
  /** 加班单（对齐后端 `OvertimeResp`） */
  export interface Overtime {
    /** 审批实例 ID（hr_approval_instance.id；0 = 无） */
    approvalInstanceId: number;
    /** 附件 ID（sys_file.id；0 = 无） */
    attachmentId: number;
    /** 补偿方式：1 转调休 / 2 计加班费 */
    compMode: number;
    /** 创建时间（`yyyy-MM-dd HH:mm:ss`） */
    createdAt: string;
    /** 创建人 sys_user.id */
    createdBy: number;
    /** 创建人显示名（后端拼装） */
    createdByName: string;
    /** 加班分钟数（后端派生：区间总长，不裁剪到班次窗口） */
    durationMinutes: number;
    /** 员工档案 ID（hr_employee.id） */
    employeeId: number;
    /** 员工姓名（后端拼装） */
    employeeName: string;
    /** 加班结束时间（`yyyy-MM-dd HH:mm:ss`） */
    endAt: string;
    id: number;
    /** 加班类型：1 工作日 / 2 休息日 / 3 法定节假日 */
    overtimeType: number;
    /** 加班事由 */
    reason: string;
    /** 备注 */
    remark: string;
    /** 加班开始时间（`yyyy-MM-dd HH:mm:ss`） */
    startAt: string;
    /** 状态：1 审批中 / 2 已通过 / 3 已驳回 / 4 已撤销 */
    status: number;
    /** 更新时间（`yyyy-MM-dd HH:mm:ss`） */
    updatedAt: string;
    /** 更新人 sys_user.id */
    updatedBy: number;
    /** 更新人显示名（后端拼装） */
    updatedByName: string;
    /** 加班所属日期（`yyyy-MM-dd`） */
    workDate: string;
  }

  /**
   * 加班单列表请求（管理视角，对齐后端 `OvertimeListReq`）：
   * 支持员工 / 状态 / 类型与加班日期区间过滤（区间含边界，传 `yyyy-MM-dd`）。
   * 注意：该端点**不做**数据归属过滤，写入口仍需本人档案。
   */
  export interface ListParams extends PageParams {
    /** 员工档案 ID 精确过滤；不传查全部 */
    employeeId?: number;
    /** 状态精确过滤（1/2/3/4）；不传查全部 */
    status?: number;
    /** 加班类型精确过滤（1/2/3）；不传查全部 */
    overtimeType?: number;
    /** 加班日期范围起（`yyyy-MM-dd`，含边界）；不传不设下限 */
    workDateBegin?: string;
    /** 加班日期范围止（`yyyy-MM-dd`，含边界）；不传不设上限 */
    workDateEnd?: string;
  }

  /**
   * 我的加班单请求（申请人自助视角，对齐后端 `MineReq`）：
   * 后端按当前登录账号的档案过滤，只支持状态过滤；账号未关联档案时报业务错误。
   */
  export interface MineParams extends PageParams {
    /** 状态精确过滤（1/2/3/4）；不传查全部 */
    status?: number;
  }

  /**
   * 创建加班单（后端 `CreateOvertimeReq`，**建单即提交审批**）：
   * 无 `status` / `durationMinutes` 字段（状态由状态机推进、时长由后端派生）；
   * `startAt` / `endAt` 必须落在 `workDate` 当天且 `endAt > startAt`。
   */
  export interface CreateParams {
    /** 附件 ID（sys_file.id；0 = 无，缺省 0） */
    attachmentId?: number;
    /** 补偿方式：1 转调休 / 2 计加班费 */
    compMode: number;
    /** 员工档案 ID（必须为当前账号关联的档案） */
    employeeId: number;
    /** 加班结束时间（`yyyy-MM-dd HH:mm:ss`） */
    endAt: string;
    /** 加班类型：1 工作日 / 2 休息日 / 3 法定节假日 */
    overtimeType: number;
    /** 加班事由（上限 255 字符） */
    reason: string;
    /** 备注（上限 255 字符） */
    remark?: string;
    /** 加班开始时间（`yyyy-MM-dd HH:mm:ss`） */
    startAt: string;
    /** 加班所属日期（`yyyy-MM-dd`，与起止时间同一天） */
    workDate: string;
  }

  /**
   * 更新加班单（后端 `UpdateOvertimeReq`）：字段与创建一致 + 主键，
   * **仅「已驳回 / 已撤销」可改**，改完需重新提交；
   * 归属（`employeeId`）一经创建不可变，传其它员工档案后端拒绝。
   */
  export interface UpdateParams extends CreateParams {
    /** 加班单主键 */
    id: number;
  }
}

/**
 * 加班单列表（管理视角：按员工 / 状态 / 类型 / 加班日期区间过滤，分页）
 */
export async function getOvertimeList(
  params: HrOvertimeApi.ListParams,
): Promise<PageResult<HrOvertimeApi.Overtime>> {
  return requestClient.post<PageResult<HrOvertimeApi.Overtime>>(
    '/hr/overtime/list',
    params,
  );
}

/**
 * 我的加班单（申请人自助视角：只看当前账号档案下的单据，分页）；
 * 当前账号未关联员工档案时后端报业务错误
 */
export async function getMyOvertimeList(
  params: HrOvertimeApi.MineParams,
): Promise<PageResult<HrOvertimeApi.Overtime>> {
  return requestClient.post<PageResult<HrOvertimeApi.Overtime>>(
    '/hr/overtime/mine',
    params,
  );
}

/** 加班单详情（软删视为不存在，报业务错误） */
export async function getOvertime(id: number): Promise<HrOvertimeApi.Overtime> {
  return requestClient.post<HrOvertimeApi.Overtime>('/hr/overtime/get', {
    id,
  } satisfies IdRequest);
}

/**
 * 创建加班单（需权限码 hr:overtime:create）：**建单即提交**，
 * 同事务起审批实例；`employeeId` 必须是本人档案
 */
export async function createOvertime(
  data: HrOvertimeApi.CreateParams,
): Promise<HrOvertimeApi.Overtime> {
  return requestClient.post<HrOvertimeApi.Overtime>(
    '/hr/overtime/create',
    data,
  );
}

/**
 * 修改加班单（需权限码 hr:overtime:update）：仅「已驳回 / 已撤销」可改，
 * 改完不自动重提，需再调 `submitOvertime`
 */
export async function updateOvertime(
  data: HrOvertimeApi.UpdateParams,
): Promise<HrOvertimeApi.Overtime> {
  return requestClient.post<HrOvertimeApi.Overtime>(
    '/hr/overtime/update',
    data,
  );
}

/**
 * 删除加班单（软删，需权限码 hr:overtime:delete）：
 * 审批中的单据先撤在途审批实例，其余直接软删
 */
export async function deleteOvertime(id: number) {
  return requestClient.post<null>('/hr/overtime/delete', {
    id,
  } satisfies IdRequest);
}

/**
 * 重新提交加班单（需权限码 hr:overtime:submit）：仅「已驳回 / 已撤销」，
 * 同事务重新起审批实例
 */
export async function submitOvertime(
  id: number,
): Promise<HrOvertimeApi.Overtime> {
  return requestClient.post<HrOvertimeApi.Overtime>('/hr/overtime/submit', {
    id,
  } satisfies IdRequest);
}

/**
 * 撤销加班单（需权限码 hr:overtime:cancel）：仅「审批中」，
 * 先置「已撤销」再撤在途审批实例
 */
export async function cancelOvertime(id: number) {
  return requestClient.post<null>('/hr/overtime/cancel', {
    id,
  } satisfies IdRequest);
}
