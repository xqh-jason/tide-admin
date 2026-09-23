import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrApprovalFlowApi, SystemRoleApi, SystemUserApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';
import { useAuditColumns } from '#/views/system/audit-columns';

import { enabledStatusOptions } from '../../shared/employee-select';
import { approvalNodeTypeOptions, yesNoOptions } from '../../shared/options';

/**
 * 审批流配置页 schema / 列配置。
 * 契约要点（对齐后端 `CreateFlowReq` / `FlowResp` / `UpsertFlowNodeReq`）：
 * - 模板 `bizType` 取值来自字典 `approvalBizType`（后端按启用项校验，前端不硬编码）；
 * - 同 `bizType` 软删后重建 = **恢复原行**（唯一键含软删占位），不是插入新行；
 * - 节点 `nodeType` 决定 `approverRefId` 控件：3 指定用户 / 4 指定角色，
 *   1 直属上级 / 2 部门负责人 由后端按申请人组织关系解析，前端隐藏该字段并提交 0；
 * - 模板的**最后一个节点不允许跳过**（`skipIfEmpty` 必须 0）：最后一个节点（seq 最大）
 *   的「是」选项直接禁选，其余情况由后端写后复核兜底。
 */

/** 审批人下拉项：Element Plus Select 的 option（`disabled` 为后端不可用值，置灰不可选） */
export interface ApproverOption {
  disabled: boolean;
  label: string;
  value: number;
}

/** 指定用户候选（nodeType=3）：软删账号置灰（先例见 views/biz/hr/employee/data.ts） */
export function approverUserOptions(
  items: SystemUserApi.UserBrief[],
): ApproverOption[] {
  return items.map((user) => ({
    disabled: user.deleted,
    label: user.username,
    value: user.id,
  }));
}

/** 指定角色候选（nodeType=4）：停用角色置灰（后端要求角色存在且启用） */
export function approverRoleOptions(
  items: SystemRoleApi.SystemRole[],
): ApproverOption[] {
  return items.map((role) => ({
    disabled: role.status === 0,
    label: role.roleName,
    value: role.id,
  }));
}

/**
 * 模板新增/编辑表单 schema。
 * 编辑态 `bizType` 仍可改（后端变更时查重），无只读字段。
 */
export function useFormSchema(): VbenFormSchema[] {
  const bizTypeOptions = useDictOptions('approvalBizType');
  return [
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        filterable: true,
        options: bizTypeOptions,
        placeholder: $t('hr.approval.flow.bizTypeTip'),
      },
      fieldName: 'bizType',
      help: $t('hr.approval.flow.bizTypeHelp'),
      label: $t('hr.approval.flow.bizType'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
      },
      fieldName: 'name',
      label: $t('hr.approval.flow.name'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: enabledStatusOptions(),
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('hr.approval.flow.status'),
      rules: 'selectRequired',
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'remark',
      label: $t('hr.common.remark'),
    },
  ];
}

/** 模板列表搜索项：keyword（业务类型 / 模板名称模糊）+ status（启用状态） */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('hr.approval.flow.keywordTip'),
      },
      fieldName: 'keyword',
      label: $t('hr.approval.flow.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: enabledStatusOptions(),
      },
      fieldName: 'status',
      label: $t('hr.approval.flow.status'),
    },
  ];
}

/**
 * 模板列表列配置：业务类型为字典标签、状态为启停标签，审计列复用公共 `useAuditColumns`
 * （后端 `FlowResp` 含 createdByName/updatedByName/createdAt/updatedAt）；
 * 操作列权限码：节点维护 hr:approval-flow-node:upsert、编辑 hr:approval-flow:update、
 * 删除 hr:approval-flow:delete（软删，存在审批中单据时后端拒绝）。
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrApprovalFlowApi.Flow>,
): VxeTableGridColumns<HrApprovalFlowApi.Flow> {
  const bizTypeOptions = useDictOptions('approvalBizType');
  return [
    {
      cellRender: { name: 'CellTag', options: bizTypeOptions },
      field: 'bizType',
      title: $t('hr.approval.flow.bizType'),
      width: 120,
    },
    {
      field: 'name',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.approval.flow.name'),
    },
    {
      cellRender: { name: 'CellTag', options: enabledStatusOptions() },
      field: 'status',
      title: $t('hr.approval.flow.status'),
      width: 90,
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    ...useAuditColumns<HrApprovalFlowApi.Flow>(),
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('hr.approval.flow.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            auth: 'hr:approval-flow-node:upsert',
            code: 'nodes',
            text: $t('hr.approval.flow.nodes'),
          },
          { auth: 'hr:approval-flow:update', code: 'edit' },
          {
            auth: 'hr:approval-flow:delete',
            code: 'delete',
            // 后端在有审批中单据时拒绝删除，确认文案显式提示
            confirmTitle: (row: HrApprovalFlowApi.Flow) =>
              $t('hr.approval.flow.deleteConfirmTip', [row.name]),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.approval.flow.operation'),
      width: 200,
    },
  ];
}

/**
 * 节点列表列配置：`seq` 升序（后端已排序），审批人列按引用 ID 解析显示名
 * （1 / 2 由后端在提交时按申请人组织关系解析，列表只展示节点类型）；
 * 操作列权限码统一为 hr:approval-flow-node:upsert（节点无独立删除权限码）。
 */
export function useNodeColumns(
  onActionClick: OnActionClickFn<HrApprovalFlowApi.FlowNode> | undefined,
  resolveApprover: (node: HrApprovalFlowApi.FlowNode) => string,
): VxeTableGridColumns<HrApprovalFlowApi.FlowNode> {
  return [
    {
      field: 'seq',
      title: $t('hr.approval.flow.seq'),
      width: 80,
    },
    {
      field: 'nodeName',
      minWidth: 140,
      showOverflow: true,
      title: $t('hr.approval.flow.nodeName'),
    },
    {
      cellRender: { name: 'CellTag', options: approvalNodeTypeOptions() },
      field: 'nodeType',
      title: $t('hr.approval.flow.nodeType'),
      width: 110,
    },
    {
      field: 'approver',
      formatter: ({ row }) =>
        resolveApprover(row as HrApprovalFlowApi.FlowNode),
      minWidth: 140,
      showOverflow: true,
      title: $t('hr.approval.flow.approver'),
    },
    {
      cellRender: { name: 'CellTag', options: yesNoOptions() },
      field: 'skipIfEmpty',
      title: $t('hr.approval.flow.skipIfEmpty'),
      width: 100,
    },
    {
      field: 'remark',
      minWidth: 120,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    {
      field: 'updatedAt',
      formatter: 'formatDateTime',
      title: $t('hr.approval.flow.nodeUpdatedAt'),
      width: 170,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'nodeName',
          nameTitle: $t('hr.approval.flow.nodeName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { auth: 'hr:approval-flow-node:upsert', code: 'edit' },
          {
            auth: 'hr:approval-flow-node:upsert',
            code: 'delete',
            // 删除后新的最后一个节点若配置了「跳过」会被后端拒绝，确认文案显式提示
            confirmTitle: (row: HrApprovalFlowApi.FlowNode) =>
              $t('hr.approval.flow.nodeDeleteConfirmTip', [row.nodeName]),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.approval.flow.operation'),
      width: 130,
    },
  ];
}
