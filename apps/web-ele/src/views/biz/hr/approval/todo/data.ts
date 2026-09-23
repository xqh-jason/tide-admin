import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrApprovalInstanceApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { approvalStatusOptions } from '../../shared/options';

/**
 * 我的待办页 schema / 列配置。
 * 契约要点（对齐后端 TodoListReq / InstanceResp）：
 * - 后端按当前登录人过滤（当前节点轮到我 / 我持有该角色池角色），只支持 `bizType` 过滤；
 * - 列表为审批人视角的推进队列，无审计列（不展示创建人 / 更新人）。
 */

/** 待办搜索项：bizType（业务类型，字典 approvalBizType），与后端 TodoListReq 一一对应 */
export function useGridFormSchema(): VbenFormSchema[] {
  const bizTypeOptions = useDictOptions('approvalBizType');
  return [
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: bizTypeOptions,
      },
      fieldName: 'bizType',
      label: $t('hr.approval.todo.bizType'),
    },
  ];
}

/**
 * 待办列表列配置：状态用公共 approvalStatusOptions；
 * 当前审批人角色池节点（`currentApproverId = 0`）后端返回空串，
 * 这里按「角色池 #roleId」兜底展示，与共享 <ApprovalProgress> 的口径一致；
 * 操作列权限码：通过 hr:approval-instance:approve、驳回 hr:approval-instance:reject
 * （审批抽屉内两个按钮分别声明，有其一即可进入抽屉）。
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrApprovalInstanceApi.ApprovalInstance>,
): VxeTableGridColumns<HrApprovalInstanceApi.ApprovalInstance> {
  const bizTypeOptions = useDictOptions('approvalBizType');
  return [
    {
      field: 'applicantName',
      title: $t('hr.common.applicant'),
      width: 110,
    },
    {
      cellRender: { name: 'CellTag', options: bizTypeOptions },
      field: 'bizType',
      title: $t('hr.approval.todo.bizType'),
      width: 120,
    },
    {
      cellRender: { name: 'CellTag', options: approvalStatusOptions() },
      field: 'status',
      title: $t('hr.common.approvalStatus'),
      width: 100,
    },
    {
      // 当前审批人无独立响应字段：按 currentApproverName / currentApproverRoleId 解析
      field: 'currentApproverId',
      formatter: ({ row }) => {
        const instance = row as HrApprovalInstanceApi.ApprovalInstance;
        if (instance.currentApproverName) {
          return instance.currentApproverName;
        }
        return instance.currentApproverRoleId
          ? `${$t('hr.common.rolePool')} #${instance.currentApproverRoleId}`
          : '-';
      },
      minWidth: 130,
      showOverflow: true,
      title: $t('hr.common.currentApprover'),
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('hr.common.submittedAt'),
      width: 170,
    },
    {
      field: 'finishedAt',
      formatter: 'formatDateTime',
      title: $t('hr.common.finishedAt'),
      width: 170,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'applicantName',
          nameTitle: $t('hr.common.applicant'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            auth: [
              'hr:approval-instance:approve',
              'hr:approval-instance:reject',
            ],
            code: 'approve',
            text: $t('hr.approval.todo.approve'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.approval.todo.operation'),
      width: 110,
    },
  ];
}
