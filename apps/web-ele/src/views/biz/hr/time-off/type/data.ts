import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrTimeOffTypeApi } from '#/api';
import type { DictOption } from '#/store';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';
import { formatMinutes } from '#/views/biz/hr/shared/format';
import { yesNoOptions } from '#/views/biz/hr/shared/options';
import { useAuditColumns } from '#/views/system/audit-columns';

/**
 * 假期类型（后端 `biz/hr/time-off` 的 `type` 段）表单 / 搜索 / 列定义。
 *
 * 字段与后端 `CreateTimeOffTypeReq` / `UpdateTimeOffTypeReq` 一一对应且**全字段必填**，
 * 编辑态全量提交；值域与常量定义点（后端 `time_off/mod.rs`）：
 * - `unit` 1 天 / 2 小时；
 * - `balanceMode` 1 扣额度 / 0 只记录不扣额度（如事假）；
 * - `minUnitMinutes` 单位是**分钟**（240 = 半天、480 = 一天），不是天数；
 * - `payRatio` 是**千分比**（1000 = 全额计薪、0 = 无薪）；
 * - `requireAttachment` / `allowNegative` 1 是 / 0 否（复用共享 `yesNoOptions`）；
 * - `status` 走平台 `status` 字典（1 启用 / 0 停用），与后端校验的字典取值同源。
 */

/** 计量单位选项：1 天 / 2 小时（`hr_time_off_type.unit`） */
export function unitOptions(): DictOption[] {
  return [
    { label: $t('hr.timeOff.type.unitDay'), value: 1 },
    { label: $t('hr.timeOff.type.unitHour'), value: 2 },
  ];
}

/** 额度模式选项：1 扣额度 / 0 只记录不扣额度（`hr_time_off_type.balance_mode`） */
export function balanceModeOptions(): DictOption[] {
  return [
    {
      label: $t('hr.timeOff.type.balanceModeDeduct'),
      type: 'success',
      value: 1,
    },
    {
      label: $t('hr.timeOff.type.balanceModeRecordOnly'),
      type: 'info',
      value: 0,
    },
  ];
}

/** 新增/编辑表单 schema：覆盖 `CreateTimeOffTypeReq` 全部字段 */
export function useFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        // 列宽 VARCHAR(32)，与后端校验上限一致
        maxlength: 32,
      },
      fieldName: 'typeCode',
      help: $t('hr.timeOff.type.typeCodeTip'),
      label: $t('hr.timeOff.type.typeCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        // 列宽 VARCHAR(64)
        maxlength: 64,
      },
      fieldName: 'typeName',
      label: $t('hr.timeOff.type.typeName'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: unitOptions(),
      },
      defaultValue: 1,
      fieldName: 'unit',
      label: $t('hr.timeOff.type.unit'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        options: balanceModeOptions(),
      },
      defaultValue: 1,
      fieldName: 'balanceMode',
      label: $t('hr.timeOff.type.balanceMode'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        min: 1,
        precision: 0,
        step: 60,
      },
      defaultValue: 240,
      fieldName: 'minUnitMinutes',
      help: $t('hr.timeOff.type.minUnitMinutesTip'),
      label: $t('hr.timeOff.type.minUnitMinutes'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: yesNoOptions(),
      },
      defaultValue: 0,
      fieldName: 'requireAttachment',
      label: $t('hr.timeOff.type.requireAttachment'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        options: yesNoOptions(),
      },
      defaultValue: 0,
      fieldName: 'allowNegative',
      label: $t('hr.timeOff.type.allowNegative'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        max: 1000,
        min: 0,
        precision: 0,
        step: 100,
      },
      defaultValue: 1000,
      fieldName: 'payRatio',
      help: $t('hr.timeOff.type.payRatioTip'),
      label: $t('hr.timeOff.type.payRatio'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: statusOptions,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('hr.timeOff.type.status'),
      rules: 'selectRequired',
    },
    {
      component: 'Textarea',
      componentProps: {
        // 列宽 VARCHAR(255)
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'remark',
      label: $t('hr.common.remark'),
    },
  ];
}

/** 搜索表单 schema：与 `TimeOffTypeListReq` 一一对应（keyword 模糊编码/名称 + status 精确） */
export function useGridFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('hr.timeOff.type.keywordPlaceholder'),
      },
      fieldName: 'keyword',
      label: $t('hr.timeOff.type.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('hr.timeOff.type.status'),
    },
  ];
}

/**
 * 列表列配置：审计列复用公共 `useAuditColumns`（`TimeOffTypeListReq` 不支持审计过滤，
 * 故搜索区不挂 `useAuditSearchSchema`）；时长列按分钟格式化，枚举列用 CellTag
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrTimeOffTypeApi.TimeOffType>,
): VxeTableGridColumns<HrTimeOffTypeApi.TimeOffType> {
  const statusOptions = useDictOptions('status');
  return [
    { field: 'typeCode', title: $t('hr.timeOff.type.typeCode'), width: 140 },
    { field: 'typeName', title: $t('hr.timeOff.type.typeName'), width: 140 },
    {
      cellRender: { name: 'CellTag', options: unitOptions() },
      field: 'unit',
      title: $t('hr.timeOff.type.unit'),
      width: 100,
    },
    {
      cellRender: { name: 'CellTag', options: balanceModeOptions() },
      field: 'balanceMode',
      title: $t('hr.timeOff.type.balanceMode'),
      width: 130,
    },
    {
      field: 'minUnitMinutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('hr.timeOff.type.minUnitMinutes'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: yesNoOptions() },
      field: 'requireAttachment',
      title: $t('hr.timeOff.type.requireAttachment'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: yesNoOptions() },
      field: 'allowNegative',
      title: $t('hr.timeOff.type.allowNegative'),
      width: 120,
    },
    {
      field: 'payRatio',
      title: $t('hr.timeOff.type.payRatio'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: $t('hr.timeOff.type.status'),
      width: 100,
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    ...useAuditColumns<HrTimeOffTypeApi.TimeOffType>(),
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'typeName',
          nameTitle: $t('hr.timeOff.type.typeName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { auth: 'hr:time-off-type:update', code: 'edit' },
          {
            auth: 'hr:time-off-type:delete',
            code: 'delete',
            // 软删仍占着唯一编码，且已有额度批次的类型后端拒绝删除，确认文案显式提示
            confirmTitle: (row: HrTimeOffTypeApi.TimeOffType) =>
              $t('hr.timeOff.type.deleteConfirmTip', [row.typeName]),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.timeOff.type.operation'),
      width: 140,
    },
  ];
}
