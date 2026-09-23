import type { DictOption } from '#/store';

import { $t } from '#/locales';

/**
 * ElTag / ElTimelineItem 的合法颜色取值。
 * 字典与选项里的 `type` 是普通 `string`（`DictOption.type?: string`），
 * 渲染前用它收窄，避免 `any` 断言散落各处。
 */
export type TagType = 'danger' | 'info' | 'primary' | 'success' | 'warning';

/**
 * 跨页共享的枚举选项（HR 各页共用，避免每页各写一份同构选项）。
 * 值域全部来自后端常量定义点，改后端常量时同步改这里：
 * - 审批实例状态：`modules/biz/hr/approval/mod.rs`；
 * - 节点动作 / 节点类型：同上。
 */

/**
 * 状态选项：1 审批中 / 2 已通过 / 3 已驳回 / 4 已撤销。
 * 审批实例（`hr_approval_instance`）与业务单据（请假单 / 加班单）共用同一值域与文案，
 * 三处列表的状态列与状态筛选统一使用本函数。
 */
export function approvalStatusOptions(): DictOption[] {
  return [
    {
      label: $t('hr.common.approvalStatusPending'),
      type: 'warning',
      value: 1,
    },
    {
      label: $t('hr.common.approvalStatusApproved'),
      type: 'success',
      value: 2,
    },
    {
      label: $t('hr.common.approvalStatusRejected'),
      type: 'danger',
      value: 3,
    },
    {
      label: $t('hr.common.approvalStatusCanceled'),
      type: 'info',
      value: 4,
    },
  ];
}

/** 节点动作选项：0 待审批 / 1 通过 / 2 驳回 / 3 跳过 */
export function approvalActionOptions(): DictOption[] {
  return [
    { label: $t('hr.common.approvalActionPending'), type: 'info', value: 0 },
    {
      label: $t('hr.common.approvalActionApproved'),
      type: 'success',
      value: 1,
    },
    {
      label: $t('hr.common.approvalActionRejected'),
      type: 'danger',
      value: 2,
    },
    { label: $t('hr.common.approvalActionSkipped'), type: 'info', value: 3 },
  ];
}

/** 节点类型选项：1 直属上级 / 2 部门负责人 / 3 指定用户 / 4 指定角色 */
export function approvalNodeTypeOptions(): DictOption[] {
  return [
    { label: $t('hr.common.nodeTypeManager'), value: 1 },
    { label: $t('hr.common.nodeTypeDeptLeader'), value: 2 },
    { label: $t('hr.common.nodeTypeUser'), value: 3 },
    { label: $t('hr.common.nodeTypeRole'), value: 4 },
  ];
}

/** 二值选项：1 是 / 0 否（`require_attachment` / `allow_negative` / `skip_if_empty` 等） */
export function yesNoOptions(): DictOption[] {
  return [
    { label: $t('common.yes'), type: 'success', value: 1 },
    { label: $t('common.no'), type: 'info', value: 0 },
  ];
}
