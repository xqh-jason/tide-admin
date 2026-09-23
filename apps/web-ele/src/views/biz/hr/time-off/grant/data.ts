import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrTimeOffGrantApi, HrTimeOffTypeApi } from '#/api';
import type { DictOption } from '#/store';

import { getAllTimeOffTypesApi, getDeptList } from '#/api';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';
import { useEmployeeSelectProps } from '#/views/biz/hr/shared/employee-select';
import { formatMinutes } from '#/views/biz/hr/shared/format';

/** 发放范围（前端派生字段，提交时映射为 `BatchCreateGrantReq` 的三选一入参） */
export type GrantScope = 'all' | 'dept' | 'employee';

/**
 * 额度发放（后端 `biz/hr/time-off` 的 `grant` 段）表单 / 搜索 / 列定义。
 *
 * 契约要点（对齐 `TimeOffGrantListReq` / `BatchCreateGrantReq` / `TimeOffGrantResp`）：
 * - 批次是额度的事实来源：`minutes` 是授予总数、`remainingMinutes` 是剩余可用；
 * - 批量发放范围**三选一**（employees / dept / all），`reason` 与 `period` 是幂等键，
 *   同「员工 × 假期类型 × 依据 × 周期」重复发放由后端计入 `skipped`；
 * - `status` / `source` / `sourceKind` 值域来自后端常量定义点（`time_off/mod.rs`），
 *   无同名平台字典，故在此就地声明选项；
 * - `reason` 走字典 `timeOffGrantReason`（字符串枚举，如 `comp` = 加班转调休）。
 */

/** 批次状态选项：1 有效 / 2 已用尽 / 3 已失效 / 4 已撤销（`GrantStatusOptions`） */
export function grantStatusOptions(): DictOption[] {
  return [
    { label: $t('hr.timeOff.grant.statusActive'), type: 'success', value: 1 },
    { label: $t('hr.timeOff.grant.statusExhausted'), type: 'info', value: 2 },
    { label: $t('hr.timeOff.grant.statusExpired'), type: 'warning', value: 3 },
    { label: $t('hr.timeOff.grant.statusCanceled'), type: 'danger', value: 4 },
  ];
}

/** 来源选项：1 发放 / 2 手工调整 / 3 加班转调休（`GRANT_SOURCE_*`） */
export function grantSourceOptions(): DictOption[] {
  return [
    { label: $t('hr.timeOff.grant.sourceIssue'), value: 1 },
    { label: $t('hr.timeOff.grant.sourceManual'), value: 2 },
    { label: $t('hr.timeOff.grant.sourceOvertime'), value: 3 },
  ];
}

/**
 * 来源对象类型选项：0 无 / 1 系统任务 / 2 请假单 / 3 加班单 / 4 手工
 * （`SOURCE_KIND_*`，与额度流水同口径，配合 `sourceId` 追溯来源单据）
 */
export function grantSourceKindOptions(): DictOption[] {
  return [
    { label: $t('hr.timeOff.grant.sourceKindNone'), type: 'info', value: 0 },
    { label: $t('hr.timeOff.grant.sourceKindJob'), value: 1 },
    { label: $t('hr.timeOff.grant.sourceKindTimeOff'), value: 2 },
    { label: $t('hr.timeOff.grant.sourceKindOvertime'), value: 3 },
    { label: $t('hr.timeOff.grant.sourceKindManual'), value: 4 },
  ];
}

/** 假期类型下拉数据源（`getAllTimeOffTypesApi` 一次取满后映射为选项） */
function timeOffTypeSelectProps() {
  return {
    afterFetch: (items: HrTimeOffTypeApi.TimeOffType[]) =>
      items.map((item) => ({ label: item.typeName, value: item.id })),
    api: getAllTimeOffTypesApi,
    clearable: true,
    filterable: true,
  };
}

/**
 * 批量发放表单 schema（对齐 `BatchCreateGrantReq`）。
 * `scope` 为前端派生的范围选择（后端不收该字段），据此显隐并收敛提交体的
 * `employeeIds` / `deptId` / `all`（后端校验三选一，互斥）。
 */
export function useFormSchema(): VbenFormSchema[] {
  const reasonOptions = useDictOptions('timeOffGrantReason');
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: [
          { label: $t('hr.timeOff.grant.scopeEmployee'), value: 'employee' },
          { label: $t('hr.timeOff.grant.scopeDept'), value: 'dept' },
          { label: $t('hr.timeOff.grant.scopeAll'), value: 'all' },
        ],
      },
      defaultValue: 'employee',
      fieldName: 'scope',
      label: $t('hr.timeOff.grant.scope'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        ...useEmployeeSelectProps($t('hr.timeOff.grant.employeePlaceholder')),
        multiple: true,
      },
      dependencies: {
        rules: (values) =>
          values.scope === 'employee' ? 'selectRequired' : null,
        show: (values) => values.scope === 'employee',
        triggerFields: ['scope'],
      },
      fieldName: 'employeeIds',
      help: $t('hr.timeOff.grant.employeeIdsTip'),
      label: $t('hr.timeOff.grant.employees'),
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        api: getDeptList,
        // 允许选中非叶子部门：目标是该部门「直属挂载」的员工（不含子部门）
        checkStrictly: true,
        defaultExpandAll: true,
        labelField: 'deptName',
        valueField: 'id',
      },
      dependencies: {
        rules: (values) => (values.scope === 'dept' ? 'selectRequired' : null),
        show: (values) => values.scope === 'dept',
        triggerFields: ['scope'],
      },
      fieldName: 'deptId',
      help: $t('hr.timeOff.grant.deptIdTip'),
      label: $t('hr.timeOff.grant.dept'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        ...timeOffTypeSelectProps(),
      },
      fieldName: 'timeOffTypeId',
      label: $t('hr.timeOff.grant.timeOffType'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        min: 1,
        precision: 0,
        step: 60,
      },
      fieldName: 'minutes',
      help: $t('hr.timeOff.grant.minutesTip'),
      label: $t('hr.timeOff.grant.minutes'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: reasonOptions,
      },
      fieldName: 'reason',
      label: $t('hr.timeOff.grant.reason'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 16,
      },
      defaultValue: String(new Date().getFullYear()),
      fieldName: 'period',
      help: $t('hr.timeOff.grant.periodTip'),
      label: $t('hr.timeOff.grant.period'),
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'effectiveAt',
      label: $t('hr.timeOff.grant.effectiveAt'),
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'expireAt',
      help: $t('hr.timeOff.grant.expireAtTip'),
      label: $t('hr.timeOff.grant.expireAt'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 2,
        showWordLimit: true,
      },
      fieldName: 'remark',
      label: $t('hr.common.remark'),
    },
  ];
}

/** 搜索表单 schema：与 `TimeOffGrantListReq` 一一对应（无时间范围字段，勿自行添加） */
export function useGridFormSchema(): VbenFormSchema[] {
  const reasonOptions = useDictOptions('timeOffGrantReason');
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        ...useEmployeeSelectProps($t('hr.timeOff.grant.employeePlaceholder')),
      },
      fieldName: 'employeeId',
      label: $t('hr.timeOff.grant.employee'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        ...timeOffTypeSelectProps(),
      },
      fieldName: 'timeOffTypeId',
      label: $t('hr.timeOff.grant.timeOffType'),
    },
    {
      component: 'Select',
      componentProps: {
        // 后端按 reason 模糊匹配（字典 timeOffGrantReason 的 value，如 comp）
        clearable: true,
        options: reasonOptions,
      },
      fieldName: 'reason',
      label: $t('hr.timeOff.grant.reason'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 16,
      },
      fieldName: 'period',
      label: $t('hr.timeOff.grant.period'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: grantStatusOptions(),
      },
      fieldName: 'status',
      label: $t('hr.timeOff.grant.status'),
    },
  ];
}

/**
 * 批次列表列配置：`TimeOffGrantResp` 是追加型账本（只有 `createdAt`，无 `updatedAt`），
 * 故不使用公共审计列；时长列按分钟格式化，撤销入口在页面模板的 action 插槽内
 */
export function useColumns(): VxeTableGridColumns<HrTimeOffGrantApi.Grant> {
  const reasonOptions = useDictOptions('timeOffGrantReason');
  return [
    {
      field: 'employeeName',
      title: $t('hr.timeOff.grant.employee'),
      width: 120,
    },
    {
      field: 'timeOffTypeName',
      title: $t('hr.timeOff.grant.timeOffType'),
      width: 120,
    },
    {
      cellRender: { name: 'CellTag', options: reasonOptions },
      field: 'reason',
      title: $t('hr.timeOff.grant.reason'),
      width: 130,
    },
    { field: 'period', title: $t('hr.timeOff.grant.period'), width: 100 },
    {
      field: 'minutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('hr.timeOff.grant.minutes'),
      width: 130,
    },
    {
      field: 'remainingMinutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('hr.timeOff.grant.remainingMinutes'),
      width: 130,
    },
    {
      field: 'effectiveAt',
      title: $t('hr.timeOff.grant.effectiveAt'),
      width: 120,
    },
    {
      field: 'expireAt',
      formatter: ({ cellValue }) =>
        cellValue || $t('hr.timeOff.grant.permanent'),
      title: $t('hr.timeOff.grant.expireAt'),
      width: 120,
    },
    {
      cellRender: { name: 'CellTag', options: grantStatusOptions() },
      field: 'status',
      title: $t('hr.timeOff.grant.status'),
      width: 100,
    },
    {
      cellRender: { name: 'CellTag', options: grantSourceOptions() },
      field: 'source',
      title: $t('hr.timeOff.grant.source'),
      width: 120,
    },
    {
      cellRender: { name: 'CellTag', options: grantSourceKindOptions() },
      field: 'sourceKind',
      title: $t('hr.timeOff.grant.sourceKind'),
      width: 120,
    },
    {
      field: 'remark',
      minWidth: 140,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.grant.createdAt'),
      width: 170,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('hr.timeOff.grant.operation'),
      width: 120,
    },
  ];
}
