import type {
  AuditFields,
  IdRequest,
  PageParams,
  PageResult,
} from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 审批实例与节点记录（后端域 `biz/hr/approval`，跨域共享：请假单 / 加班单详情、
 * 我的待办、审批记录三处页面都消费本文件）。
 *
 * 契约要点（对齐后端 `InstanceListReq` / `InstanceResp` / `InstanceDetailResp`）：
 * - 实例状态与节点动作由后端常量固定（`approval/mod.rs`），前端只做展示映射；
 * - 节点记录随 `instance/get` 一并返回（按 seq 升序），无需再调 `record/list`；
 * - `currentApproverId = 0` 表示当前节点是角色池（此时看 `currentApproverRoleId`）。
 */
export namespace HrApprovalInstanceApi {
  /**
   * 审批实例（对齐后端 `InstanceResp`）。
   * `bizType` 取值来自字典 `approvalBizType`（timeOff / overtime）
   */
  export interface ApprovalInstance extends AuditFields {
    /** 申请人 sys_user.id */
    applicantId: number;
    /** 申请人显示名（后端拼装） */
    applicantName: string;
    /** 业务单据 ID */
    bizId: number;
    /** 业务类型（字典 approvalBizType：timeOff 请假单 / overtime 加班单） */
    bizType: string;
    /** 当前待审批节点顺序号；0 = 无可推进节点 */
    currentSeq: number;
    /** 当前节点审批人 sys_user.id；0 = 角色池或无 */
    currentApproverId: number;
    /** 当前审批人显示名（角色池为空串） */
    currentApproverName: string;
    /** 当前节点角色池 sys_role.id；0 = 非角色池 */
    currentApproverRoleId: number;
    /** 终态时间（`yyyy-MM-dd HH:mm:ss`）；未终结为 null */
    finishedAt: null | string;
    /** 审批流模板 ID */
    flowId: number;
    id: number;
    /** 备注 */
    remark: string;
    /** 状态：1 审批中 / 2 已通过 / 3 已驳回 / 4 已撤销 */
    status: number;
  }

  /** 节点记录（对齐后端 `RecordResp`） */
  export interface Record {
    /** 动作时间（`yyyy-MM-dd HH:mm:ss`）；未动作为 null */
    actedAt: null | string;
    /** 实际操作人 sys_user.id */
    actedBy: number;
    /** 实际操作人显示名 */
    actedByName: string;
    /** 动作：0 待审批 / 1 通过 / 2 驳回 / 3 跳过 */
    action: number;
    /** 审批人 sys_user.id；0 = 角色池或解析不到 */
    approverId: number;
    /** 审批人显示名（角色池为空串） */
    approverName: string;
    /** 审批人引用 ID 快照（node_type=3 是 sys_user.id、=4 是 sys_role.id） */
    approverRefId: number;
    createdAt: string;
    id: number;
    /** 审批实例 ID */
    instanceId: number;
    /** 节点名称快照 */
    nodeName: string;
    /** 节点类型快照：1 直属上级 / 2 部门负责人 / 3 指定用户 / 4 指定角色 */
    nodeType: number;
    /** 审批意见 */
    opinion: string;
    /** 节点顺序号 */
    seq: number;
  }

  /** 实例详情（对齐后端 `InstanceDetailResp`）：实例 + 全部节点记录（seq 升序） */
  export interface Detail {
    instance: ApprovalInstance;
    records: Record[];
  }

  /** 实例列表请求（管理视角） */
  export interface ListParams extends PageParams {
    /** 申请人 sys_user.id 精确过滤；不传查全部 */
    applicantId?: number;
    /** 业务类型精确过滤（字典 approvalBizType）；不传查全部 */
    bizType?: string;
    /** 状态精确过滤（1/2/3/4）；不传查全部 */
    status?: number;
  }

  /** 我的待办请求（只看当前节点轮到自己 / 自己角色池的实例） */
  export interface TodoParams extends PageParams {
    /** 业务类型精确过滤；不传查全部 */
    bizType?: string;
  }

  /** 审批动作请求（通过 / 驳回） */
  export interface ApproveParams {
    id: number;
    /** 审批意见 */
    opinion?: string;
  }
}

/** 审批实例列表（管理视角：按业务类型 / 状态 / 申请人过滤） */
export async function getApprovalInstanceList(
  params: HrApprovalInstanceApi.ListParams,
): Promise<PageResult<HrApprovalInstanceApi.ApprovalInstance>> {
  return requestClient.post<PageResult<HrApprovalInstanceApi.ApprovalInstance>>(
    '/hr/approval/instance/list',
    params,
  );
}

/** 我的待办（当前节点轮到我 / 我持有该角色池角色的审批中实例） */
export async function getApprovalTodoList(
  params: HrApprovalInstanceApi.TodoParams,
): Promise<PageResult<HrApprovalInstanceApi.ApprovalInstance>> {
  return requestClient.post<PageResult<HrApprovalInstanceApi.ApprovalInstance>>(
    '/hr/approval/instance/todo',
    params,
  );
}

/** 审批实例详情（含全部节点记录，按 seq 升序） */
export async function getApprovalInstance(
  id: number,
): Promise<HrApprovalInstanceApi.Detail> {
  return requestClient.post<HrApprovalInstanceApi.Detail>(
    '/hr/approval/instance/get',
    { id } satisfies IdRequest,
  );
}

/** 审批通过（需权限码 hr:approval-instance:approve；仅当前节点审批人可调用） */
export async function approveApprovalInstance(
  data: HrApprovalInstanceApi.ApproveParams,
) {
  return requestClient.post<null>('/hr/approval/instance/approve', data);
}

/** 审批驳回（需权限码 hr:approval-instance:reject；实例直接置已驳回） */
export async function rejectApprovalInstance(
  data: HrApprovalInstanceApi.ApproveParams,
) {
  return requestClient.post<null>('/hr/approval/instance/reject', data);
}

/** 撤销实例（需权限码 hr:approval-instance:cancel；只有申请人本人可撤销审批中的单据） */
export async function cancelApprovalInstance(id: number) {
  return requestClient.post<null>('/hr/approval/instance/cancel', {
    id,
  } satisfies IdRequest);
}
