import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrTimeOffBalanceApi, HrTimeOffTypeApi } from '#/api';
import type { DictOption } from '#/store';

import { getAllTimeOffTypesApi } from '#/api';
import { $t } from '#/locales';

import { useEmployeeSelectProps } from '../../shared/employee-select';
import { formatMinutes } from '../../shared/format';

/**
 * 额度查询页（只读）的搜索项 / 列定义。
 *
 * 契约要点（对齐后端 `TimeOffBalanceListReq` / `TimeOffBalanceLogListReq`）：
 * - 账户列表只支持 `employeeId` / `timeOffTypeId` / `period` 三个精确过滤，
 *   **无审计过滤字段**，故不挂 `useAuditSearchSchema`（响应也没有 `createdAt`）；
 * - 分钟数字段一律经共享 `formatMinutes` 渲染（负数保留减号）；
 * - 流水列表请求同样只支持 `employeeId` / `timeOffTypeId` / `bizType`
 *   （**不支持按账期过滤**，详见详情抽屉）。
 */

/**
 * 额度流水业务类型选项（值域唯一定义点：`hr_time_off/mod.rs` 的 `LOG_BIZ_*`）。
 * 值为分钟变动的原因：授予 / 手工调整 / 请假预占 / 审批实扣 / 驳回释放 / 过期作废。
 */
export function balanceLogBizOptions(): DictOption[] {
  return [
    { label: $t('hr.timeOff.balance.bizGrant'), type: 'success', value: 1 },
    { label: $t('hr.timeOff.balance.bizAdjust'), type: 'warning', value: 2 },
    { label: $t('hr.timeOff.balance.bizLock'), type: 'info', value: 3 },
    { label: $t('hr.timeOff.balance.bizConsume'), type: 'danger', value: 4 },
    { label: $t('hr.timeOff.balance.bizRelease'), type: 'success', value: 5 },
    { label: $t('hr.timeOff.balance.bizExpire'), type: 'info', value: 6 },
  ];
}

/**
 * 额度流水来源类型选项（值域唯一定义点：`hr_time_off/mod.rs` 的 `SOURCE_KIND_*`）。
 * `sourceId` 的口径随来源变化：请假单预占 / 实扣 / 释放记的是**审批实例 ID**，
 * 加班单转调休记加班单 ID，系统任务 / 手工发放记批次 ID 或 0。
 */
export function balanceLogSourceOptions(): DictOption[] {
  return [
    { label: $t('hr.timeOff.balance.sourceNone'), type: 'info', value: 0 },
    { label: $t('hr.timeOff.balance.sourceJob'), type: 'info', value: 1 },
    { label: $t('hr.timeOff.balance.sourceTimeOff'), value: 2 },
    { label: $t('hr.timeOff.balance.sourceOvertime'), value: 3 },
    { label: $t('hr.timeOff.balance.sourceManual'), value: 4 },
  ];
}

/** 额度账户搜索项：员工 / 假期类型 / 账期（三者均为精确过滤，空值不下发） */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        ...useEmployeeSelectProps($t('hr.timeOff.balance.employeeTip')),
      },
      fieldName: 'employeeId',
      label: $t('hr.timeOff.balance.employee'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: HrTimeOffTypeApi.TimeOffType[]) =>
          items.map((item) => ({ label: item.typeName, value: item.id })),
        api: getAllTimeOffTypesApi,
        clearable: true,
        filterable: true,
      },
      fieldName: 'timeOffTypeId',
      label: $t('hr.timeOff.balance.timeOffType'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('hr.timeOff.balance.periodTip'),
      },
      fieldName: 'period',
      label: $t('hr.timeOff.balance.period'),
    },
  ];
}

/** 分钟数列（右对齐 + `formatMinutes`）：账户各项额度与流水变动共用同一渲染口径 */
const minutesColumn = (title: string, width = 110) => ({
  align: 'right' as const,
  formatter: ({ cellValue }: { cellValue: number }) => formatMinutes(cellValue),
  title,
  width,
});

/**
 * 额度账户列：一行 = 「员工 × 假别 × 账期」的聚合账户；
 * 可用余额口径 = 授予 + 调整 − 实扣 − 预占 − 失效（由后端计算，前端只展示）
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrTimeOffBalanceApi.Balance>,
): VxeTableGridColumns<HrTimeOffBalanceApi.Balance> {
  return [
    {
      field: 'employeeName',
      title: $t('hr.timeOff.balance.employee'),
      width: 120,
    },
    {
      field: 'timeOffTypeName',
      title: $t('hr.timeOff.balance.timeOffType'),
      width: 130,
    },
    {
      field: 'period',
      title: $t('hr.timeOff.balance.period'),
      width: 90,
    },
    {
      field: 'grantedMinutes',
      ...minutesColumn($t('hr.timeOff.balance.grantedMinutes')),
    },
    {
      field: 'usedMinutes',
      ...minutesColumn($t('hr.timeOff.balance.usedMinutes')),
    },
    {
      field: 'lockedMinutes',
      ...minutesColumn($t('hr.timeOff.balance.lockedMinutes')),
    },
    {
      field: 'expiredMinutes',
      ...minutesColumn($t('hr.timeOff.balance.expiredMinutes')),
    },
    {
      field: 'adjustMinutes',
      ...minutesColumn($t('hr.timeOff.balance.adjustMinutes')),
    },
    {
      field: 'availableMinutes',
      ...minutesColumn($t('hr.timeOff.balance.availableMinutes'), 120),
    },
    {
      field: 'updatedAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.balance.updatedAt'),
      width: 170,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'employeeName',
          nameTitle: $t('hr.timeOff.balance.employee'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        // 只读页：唯一的行内操作是查看详情与流水
        options: [{ code: 'detail', text: $t('hr.timeOff.balance.detail') }],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.timeOff.balance.operation'),
      width: 110,
    },
  ];
}

/** 额度流水列（详情抽屉内）：业务类型 / 来源 / 变动 / 变动前后余额 / 操作人 / 发生时间 / 备注 */
export function useLogColumns(): VxeTableGridColumns<HrTimeOffBalanceApi.BalanceLog> {
  return [
    {
      cellRender: { name: 'CellTag', options: balanceLogBizOptions() },
      field: 'bizType',
      title: $t('hr.timeOff.balance.bizType'),
      width: 110,
    },
    {
      cellRender: { name: 'CellTag', options: balanceLogSourceOptions() },
      field: 'sourceKind',
      title: $t('hr.timeOff.balance.sourceKind'),
      width: 110,
    },
    {
      field: 'deltaMinutes',
      ...minutesColumn($t('hr.timeOff.balance.delta'), 130),
    },
    {
      field: 'beforeMinutes',
      ...minutesColumn($t('hr.timeOff.balance.beforeMinutes')),
    },
    {
      field: 'afterMinutes',
      ...minutesColumn($t('hr.timeOff.balance.afterMinutes')),
    },
    {
      // 来源单据 / 批次 ID：请假预占 / 实扣 / 释放时即审批实例 ID
      field: 'sourceId',
      formatter: ({ cellValue }: { cellValue: number }) => cellValue || '-',
      title: $t('hr.timeOff.balance.sourceId'),
      width: 110,
    },
    {
      // 操作人 0 = 系统（后端不返回姓名，回退「系统」占位）
      field: 'operatorName',
      formatter: ({
        cellValue,
        row,
      }: {
        cellValue: string;
        row: HrTimeOffBalanceApi.BalanceLog;
      }) =>
        cellValue ||
        (row.operatorId === 0 ? $t('hr.timeOff.balance.system') : '-'),
      title: $t('hr.timeOff.balance.operator'),
      width: 110,
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.balance.occurredAt'),
      width: 170,
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
  ];
}
