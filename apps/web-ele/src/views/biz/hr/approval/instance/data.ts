import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrApprovalInstanceApi, SystemUserApi } from '#/api';

import { getAllUsersApi } from '#/api';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { approvalStatusOptions } from '../../shared/options';

/**
 * 审批记录页 schema / 列配置。
 * 契约要点（对齐后端 InstanceListReq / InstanceResp）：
 * - 过滤项只有 bizType / status / applicantId 三个（后端无关键字与审计过滤字段），
 *   故不接 `useAuditSearchSchema()`；
 * - `applicantId` 是 sys_user.id（申请人账号），与列表展示的 `applicantName` 同源；
 * - 状态值域 1 审批中 / 2 已通过 / 3 已驳回 / 4 已撤销，复用公共 approvalStatusOptions。
 */

/** 审批记录搜索项：bizType / status / applicantId，与后端 InstanceListReq 一一对应 */
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
      label: $t('hr.approval.instance.bizType'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: approvalStatusOptions(),
      },
      fieldName: 'status',
      label: $t('hr.common.approvalStatus'),
    },
    {
      // 申请人：用户选择器精确过滤，软删账号仅作历史数据筛选、置灰禁选
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: SystemUserApi.UserBrief[]) =>
          items.map((user) => ({
            disabled: user.deleted,
            label: user.username,
            value: user.id,
          })),
        api: getAllUsersApi,
        clearable: true,
        filterable: true,
        placeholder: $t('hr.approval.instance.applicantTip'),
      },
      fieldName: 'applicantId',
      label: $t('hr.common.applicant'),
    },
  ];
}

/**
 * 审批记录列表列配置：状态用公共 approvalStatusOptions；
 * 当前审批人角色池节点（`currentApproverId = 0`）后端返回空串，
 * 这里按「角色池 #roleId」兜底展示，与共享 <ApprovalProgress> 的口径一致；
 * 操作列只有「详情」——撤销入口在详情抽屉内（申请人本人 + 审批中两个条件都要满足）。
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
      title: $t('hr.approval.instance.bizType'),
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
        options: ['detail'],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.approval.instance.operation'),
      width: 100,
    },
  ];
}
