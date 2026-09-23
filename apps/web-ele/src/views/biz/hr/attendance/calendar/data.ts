import type { FormCodec } from '@vben/common-ui';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrAttendanceCalendarApi } from '#/api';
import type { DictOption } from '#/store';

import { $t } from '#/locales';

import { formatMinutes } from '../../shared/format';
import { yesNoOptions } from '../../shared/options';

/**
 * 日期类型选项：值域来自后端常量唯一定义点
 * `modules/biz/hr/attendance/mod.rs::HOLIDAY_TYPES`（0 普通 / 1 法定节假日 / 2 调休上班）。
 */
export function holidayTypeOptions(): DictOption[] {
  return [
    {
      label: $t('hr.attendance.calendar.holidayTypeNormal'),
      type: 'info',
      value: 0,
    },
    {
      label: $t('hr.attendance.calendar.holidayTypeStatutory'),
      type: 'danger',
      value: 1,
    },
    {
      label: $t('hr.attendance.calendar.holidayTypeAdjusted'),
      type: 'warning',
      value: 2,
    },
  ];
}

/** 列表日期范围控件字段名（编解码后拆为 `dateBegin` / `dateEnd`） */
const DATE_RANGE_FIELD = 'calendarDateRange';

/**
 * 列表日期范围编解码器（同 `system/audit-search` 的 `auditTimeCodec` 思路）：
 * encode 把 daterange 数组拆成后端 `CalendarListReq` 的 `dateBegin` / `dateEnd`
 * （`yyyy-MM-dd` 纯日期，后端按 `NaiveDate` 解析，**不能补时分秒**）；
 * decode 反向还原，供表单回填。
 */
export const calendarDateRangeCodec: FormCodec = {
  decode(values) {
    const result = { ...values };
    const start = result.dateBegin;
    const end = result.dateEnd;
    if (start === undefined && end === undefined) return result;
    result[DATE_RANGE_FIELD] = [start, end].filter(
      (value) => value !== undefined,
    );
    Reflect.deleteProperty(result, 'dateBegin');
    Reflect.deleteProperty(result, 'dateEnd');
    return result;
  },
  encode(values) {
    const result = { ...values };
    const range = result[DATE_RANGE_FIELD] as string[] | undefined;
    Reflect.deleteProperty(result, DATE_RANGE_FIELD);
    if (!range) return result;
    const [start, end] = range;
    result.dateBegin = start || undefined;
    result.dateEnd = end || undefined;
    return result;
  },
};

/**
 * 单日维护表单 schema（对齐后端 `UpsertCalendarReq`）。
 *
 * 契约要点：
 * - `calendarDate` 是**唯一键**（`yyyy-MM-dd`）：已存在的日期走更新、不存在则新建，
 *   故没有「创建 / 编辑」两条路径，同一抽屉同一端点；
 * - `isWorkday`（1 是 / 0 否）与 `holidayType` 相互独立：法定节假日 = 「否」+「法定节假日」，
 *   调休上班 = 「是」+「调休上班」；
 * - `standardMinutes` 是该日标准工时（分钟），> 0 且 ≤ 1440，默认 480（后端 `DEFAULT_STANDARD_MINUTES`），
 *   当日既无排班窗口又无该值时，应出勤按 0 处理，故必须显式给出。
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'calendarDate',
      label: $t('hr.attendance.calendar.calendarDate'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: yesNoOptions(),
      },
      defaultValue: 1,
      fieldName: 'isWorkday',
      label: $t('hr.attendance.calendar.isWorkday'),
      rules: 'selectRequired',
      help: $t('hr.attendance.calendar.isWorkdayTip'),
    },
    {
      component: 'Select',
      componentProps: {
        options: holidayTypeOptions(),
      },
      defaultValue: 0,
      fieldName: 'holidayType',
      label: $t('hr.attendance.calendar.holidayType'),
      rules: 'selectRequired',
      help: $t('hr.attendance.calendar.holidayTypeTip'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        max: 1440,
        min: 1,
      },
      defaultValue: 480,
      fieldName: 'standardMinutes',
      label: $t('hr.attendance.calendar.standardMinutes'),
      rules: 'required',
      help: $t('hr.attendance.calendar.standardMinutesTip'),
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

/**
 * 区间导入表单 schema（对齐后端 `BatchImportCalendarReq`）。
 *
 * 契约要点：后端按**日期区间**逐日 upsert（不是行数组），区间含两端、
 * 单次跨度不超过 366 天，区间内每一天写入同一组「工作日 / 类型 / 标准工时 / 备注」。
 */
export function useImportFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'dateRange',
      label: $t('hr.attendance.calendar.importRange'),
      rules: 'required',
      help: $t('hr.attendance.calendar.importRangeTip'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: yesNoOptions(),
      },
      defaultValue: 1,
      fieldName: 'isWorkday',
      label: $t('hr.attendance.calendar.isWorkday'),
      rules: 'selectRequired',
      help: $t('hr.attendance.calendar.isWorkdayTip'),
    },
    {
      component: 'Select',
      componentProps: {
        options: holidayTypeOptions(),
      },
      defaultValue: 0,
      fieldName: 'holidayType',
      label: $t('hr.attendance.calendar.holidayType'),
      rules: 'selectRequired',
      help: $t('hr.attendance.calendar.holidayTypeTip'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        max: 1440,
        min: 1,
      },
      defaultValue: 480,
      fieldName: 'standardMinutes',
      label: $t('hr.attendance.calendar.standardMinutes'),
      rules: 'required',
      help: $t('hr.attendance.calendar.standardMinutesTip'),
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

/**
 * 工作日历搜索表单 schema：日期范围 + 是否工作日 + 日期类型，与 `CalendarListReq` 一一对应
 * （日期范围经 `calendarDateRangeCodec` 拆为 `dateBegin` / `dateEnd`）
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: DATE_RANGE_FIELD,
      label: $t('hr.attendance.calendar.dateRange'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: yesNoOptions(),
      },
      fieldName: 'isWorkday',
      label: $t('hr.attendance.calendar.isWorkday'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: holidayTypeOptions(),
      },
      fieldName: 'holidayType',
      label: $t('hr.attendance.calendar.holidayType'),
    },
  ];
}

/**
 * 工作日历列表列配置：无删除（日历不软删，写入即 upsert），
 * 行内只有「维护」一个操作，权限码 hr:attendance-calendar:upsert。
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrAttendanceCalendarApi.Calendar>,
): VxeTableGridColumns<HrAttendanceCalendarApi.Calendar> {
  return [
    {
      field: 'calendarDate',
      title: $t('hr.attendance.calendar.calendarDate'),
      width: 140,
    },
    {
      cellRender: { name: 'CellTag', options: yesNoOptions() },
      field: 'isWorkday',
      title: $t('hr.attendance.calendar.isWorkday'),
      width: 110,
    },
    {
      cellRender: { name: 'CellTag', options: holidayTypeOptions() },
      field: 'holidayType',
      title: $t('hr.attendance.calendar.holidayType'),
      width: 130,
    },
    {
      field: 'standardMinutes',
      formatter: ({ cellValue }: { cellValue: number }) =>
        formatMinutes(cellValue),
      title: $t('hr.attendance.calendar.standardMinutes'),
      width: 130,
    },
    {
      field: 'remark',
      minWidth: 180,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'calendarDate',
          nameTitle: $t('hr.attendance.calendar.calendarDate'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [{ auth: 'hr:attendance-calendar:upsert', code: 'edit' }],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.attendance.calendar.operation'),
      width: 100,
    },
  ];
}
