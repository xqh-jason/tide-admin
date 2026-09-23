import type {
  AuditFields,
  IdRequest,
  PageParams,
  PageResult,
} from '../system/types';

import { requestClient } from '#/api/request';

/**
 * 审批流模板与模板节点（后端域 `biz/hr/approval`，审批流配置页专用）。
 * 实例 / 节点记录的读写走 `api/hr/approvalInstance.ts`（跨域共享），本文件不重复声明。
 *
 * 契约要点（对齐后端 `FlowListReq` / `FlowResp` / `FlowNodeResp` / `UpsertFlowNodeReq`）：
 * - `bizType` 允许值来自字典 `approvalBizType`（后端取启用项 `value` 校验，前端不硬编码）；
 * - 模板 `bizType` 单列唯一且**唯一键含软删占位**：同 `bizType` 软删后重建 = **恢复原行**
 *   （覆盖 `name` / `status` / `remark` 并清空 `deletedAt`），不会插入第二条模板；
 * - 节点 `nodeType`：1 直属上级 / 2 部门负责人 / 3 指定用户（`approverRefId` = sys_user.id）/
 *   4 指定角色（`approverRefId` = sys_role.id）；1 / 2 的 `approverRefId` 后端忽略（提交 0）；
 * - **最后一个节点不允许跳过**（`skipIfEmpty` 必须 0）：新增 / 改 `seq` / 删除节点后后端都会
 *   复核最后一个节点，命中即整体失败；前端只做提示与错误兜底；
 * - 单模板节点上限 20（后端 `MAX_FLOW_NODES`），`seq` 在模板内唯一（从 1 递增）。
 */
export namespace HrApprovalFlowApi {
  /** 审批流模板（对齐后端 `FlowResp`） */
  export interface Flow extends AuditFields {
    /** 业务类型（字典 approvalBizType：timeOff 请假单 / overtime 加班单） */
    bizType: string;
    id: number;
    /** 模板名称 */
    name: string;
    /** 备注 */
    remark: string;
    /** 状态：1 启用 / 0 停用（值域来自字典 status） */
    status: number;
  }

  /** 模板节点（对齐后端 `FlowNodeResp`） */
  export interface FlowNode {
    /** 审批人引用 ID：nodeType=3 是 sys_user.id、=4 是 sys_role.id、1/2 恒为 0 */
    approverRefId: number;
    createdAt: string;
    /** 所属模板 ID */
    flowId: number;
    id: number;
    /** 节点名称 */
    nodeName: string;
    /** 节点类型：1 直属上级 / 2 部门负责人 / 3 指定用户 / 4 指定角色 */
    nodeType: number;
    /** 备注 */
    remark: string;
    /** 顺序号（模板内唯一，从 1 递增） */
    seq: number;
    /** 解析不到审批人时是否跳过：1 跳过 / 0 报错（最后一个节点必须为 0） */
    skipIfEmpty: number;
    updatedAt: string;
  }

  /** 模板详情（对齐后端 `FlowDetailResp`）：模板 + 节点（按 seq 升序） */
  export interface FlowDetail {
    flow: Flow;
    nodes: FlowNode[];
  }

  /**
   * 模板列表请求。
   * 后端 `FlowListReq` 只支持 keyword / status 过滤（无审计过滤字段），
   * 故本页不接 `useAuditSearchSchema()`。
   */
  export interface ListParams extends PageParams {
    /** 模糊搜索关键字（匹配业务类型 / 模板名称）；不传查全部 */
    keyword?: string;
    /** 状态精确过滤（1 启用 / 0 停用）；不传查全部 */
    status?: number;
  }

  /** 创建模板请求（对齐后端 `CreateFlowReq`） */
  export interface CreateParams {
    /** 业务类型（字典 approvalBizType；同 bizType 软删后重建 = 恢复原行） */
    bizType: string;
    name: string;
    remark: string;
    /** 1 启用 / 0 停用 */
    status: number;
  }

  /** 更新模板请求（对齐后端 `UpdateFlowReq`）：`bizType` 变更时后端查重 */
  export interface UpdateParams extends CreateParams {
    id: number;
  }

  /** 节点列表请求（对齐后端 `FlowNodeListReq`） */
  export interface FlowNodeListParams extends PageParams {
    flowId: number;
  }

  /** 节点新增 / 修改请求（对齐后端 `UpsertFlowNodeReq`，`id` 缺省或 0 = 新增） */
  export interface FlowNodeUpsertParams {
    /** nodeType=3 传 sys_user.id、=4 传 sys_role.id、1/2 传 0 */
    approverRefId?: number;
    flowId: number;
    id?: number;
    nodeName: string;
    nodeType: number;
    remark: string;
    /** 模板内唯一，从 1 递增（后端上限 100） */
    seq: number;
    /** 1 跳过 / 0 报错；最后一个节点必须为 0 */
    skipIfEmpty: number;
  }
}

/** 审批流模板列表（分页；`keyword` 模糊匹配业务类型 / 模板名称，`status` 精确过滤） */
export async function getApprovalFlowList(
  params: HrApprovalFlowApi.ListParams,
): Promise<PageResult<HrApprovalFlowApi.Flow>> {
  return requestClient.post<PageResult<HrApprovalFlowApi.Flow>>(
    '/hr/approval/flow/list',
    params,
  );
}

/** 审批流模板详情（含节点，按 seq 升序；节点维护抽屉以此为唯一数据来源） */
export async function getApprovalFlow(
  id: number,
): Promise<HrApprovalFlowApi.FlowDetail> {
  return requestClient.post<HrApprovalFlowApi.FlowDetail>(
    '/hr/approval/flow/get',
    { id } satisfies IdRequest,
  );
}

/**
 * 创建审批流模板（需权限码 hr:approval-flow:create）。
 * 同 `bizType` 的软删行占着唯一键：重建即恢复原行（覆盖字段、清空 `deletedAt`）。
 */
export async function createApprovalFlow(
  data: HrApprovalFlowApi.CreateParams,
): Promise<HrApprovalFlowApi.Flow> {
  return requestClient.post<HrApprovalFlowApi.Flow>(
    '/hr/approval/flow/create',
    data,
  );
}

/** 更新审批流模板（需权限码 hr:approval-flow:update；`bizType` 变更时后端查重） */
export async function updateApprovalFlow(
  data: HrApprovalFlowApi.UpdateParams,
): Promise<HrApprovalFlowApi.Flow> {
  return requestClient.post<HrApprovalFlowApi.Flow>(
    '/hr/approval/flow/update',
    data,
  );
}

/**
 * 删除审批流模板（软删，需权限码 hr:approval-flow:delete）；
 * 该模板下存在审批中的实例时后端拒绝，前端只做确认提示。
 */
export async function deleteApprovalFlow(id: number) {
  return requestClient.post<null>('/hr/approval/flow/delete', {
    id,
  } satisfies IdRequest);
}

/** 模板节点列表（按 seq 升序；节点数上限 20，一次取满即可） */
export async function getApprovalFlowNodeList(
  params: HrApprovalFlowApi.FlowNodeListParams,
): Promise<PageResult<HrApprovalFlowApi.FlowNode>> {
  return requestClient.post<PageResult<HrApprovalFlowApi.FlowNode>>(
    '/hr/approval/flow-node/list',
    params,
  );
}

/**
 * 新增 / 修改模板节点（需权限码 hr:approval-flow-node:upsert；`id` 缺省或 0 = 新增）。
 * 后端约束：`(flowId, seq)` 唯一、指定用户 / 角色必须存在且启用、
 * 写入后复核「最后一个节点不允许跳过」——命中即整单失败，前端按后端错误兜底。
 */
export async function upsertApprovalFlowNode(
  data: HrApprovalFlowApi.FlowNodeUpsertParams,
): Promise<HrApprovalFlowApi.FlowNode> {
  return requestClient.post<HrApprovalFlowApi.FlowNode>(
    '/hr/approval/flow-node/upsert',
    data,
  );
}

/**
 * 删除模板节点（硬删，需权限码 hr:approval-flow-node:upsert）；
 * 删除后若新的最后一个节点配置了「跳过」，后端拒绝并提示先修改该节点。
 */
export async function deleteApprovalFlowNode(id: number) {
  return requestClient.post<null>('/hr/approval/flow-node/delete', {
    id,
  } satisfies IdRequest);
}
