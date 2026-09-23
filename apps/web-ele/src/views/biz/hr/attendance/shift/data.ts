import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrAttendanceShiftApi } from '#/api';

import { $t } from '#/locales';

import { enabledStatusOptions } from '../../shared/employee-select';
import { formatMinutes } from '../../shared/format';
import { yesNoOptions } from '../../shared/options';

/** 班次窗口诊断结果 */
export type ShiftWindowState =
  | { exceeded: boolean; kind: 'ok'; minutes: number; sum: number }
  /** 时间口径不合法：`order` = 非跨天班 end ≤ start；`crossDayOrder` = 跨天班 end > start */
  | { kind: 'empty' }
  /** 窗口与「应工作 + 休息」的对比（`exceeded` 为 true 时后端会拒绝） */
  | { kind: 'invalid'; reason: 'crossDayOrder' | 'order' };

/**
 * 班次窗口诊断（`startTime` / `endTime` 为 `HH:MM:SS`）。
 *
 * 窗口口径与后端 `validate.rs::window_minutes` 一致：非跨天班 = `end − start`，
 * 跨天班顺延次日 = `end + 24h − start`（`end == start` 是 24 小时窗口，合法；
 * 跨天班 `end > start` 是交叉区间，后端拒绝）。后端以秒计算，这里按分钟取整，
 * 只用于抽屉内的实时提示，最终以后端校验为准。
 */
export function resolveShiftWindow(
  startTime?: string,
  endTime?: string,
  crossDay?: number,
  workMinutes?: number,
  restMinutes?: number,
): ShiftWindowState {
  const start = parseTimeToSeconds(startTime);
  const end = parseTimeToSeconds(endTime);
  if (start === null || end === null) return { kind: 'empty' };
  if (crossDay === 1 ? end > start : end <= start) {
    return {
      kind: 'invalid',
      reason: crossDay === 1 ? 'crossDayOrder' : 'order',
    };
  }
  const minutes = Math.floor(
    (end - start + (crossDay === 1 ? 24 * 60 * 60 : 0)) / 60,
  );
  const sum = (workMinutes ?? 0) + (restMinutes ?? 0);
  return { exceeded: sum > minutes, kind: 'ok', minutes, sum };
}

/** `HH:MM:SS` / `HH:MM` → 当日秒数；不合法返回 null */
function parseTimeToSeconds(value?: string): null | number {
  if (!value) return null;
  const parts = value.split(':').map(Number);
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) return null;
  const [hours = 0, minutes = 0, seconds = 0] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 班次新增/编辑表单 schema（对齐后端 `CreateShiftReq` / `UpdateShiftReq`）。
 *
 * 契约要点：
 * - 两个请求字段完全同名同型、全字段必填（无独立启停端点，状态随表单全量提交）；
 * - `startTime` / `endTime` 是 `HH:MM:SS` 字符串（后端 `parse_time` 按 `%H:%M:%S` 解析，
 *   故 TimePicker 的 `valueFormat` 必须是 `HH:mm:ss`）；
 * - `shiftCode` 仅小写字母 / 数字 / 下划线、长度 ≤ 32，全局唯一（含软删占位）；
 * - `crossDay = 1` 表示 `endTime` 落在次日；跨天班窗口顺延 24 小时；
 * - `workMinutes + restMinutes` 不得超过班次窗口（后端校验，窗口是逐日封顶值），
 *   抽屉内另有实时提示，见 `modules/form.vue`。
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('hr.attendance.shift.shiftCodeTip'),
      },
      fieldName: 'shiftCode',
      label: $t('hr.attendance.shift.shiftCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
      },
      fieldName: 'shiftName',
      label: $t('hr.attendance.shift.shiftName'),
      rules: 'required',
    },
    {
      component: 'TimePicker',
      componentProps: {
        format: 'HH:mm:ss',
        // 后端要求 `HH:MM:SS`：值格式固定到秒，避免回传 `09:00` 被判格式错误
        valueFormat: 'HH:mm:ss',
      },
      defaultValue: '09:00:00',
      fieldName: 'startTime',
      label: $t('hr.attendance.shift.startTime'),
      rules: 'required',
    },
    {
      component: 'TimePicker',
      componentProps: {
        format: 'HH:mm:ss',
        valueFormat: 'HH:mm:ss',
      },
      defaultValue: '18:00:00',
      fieldName: 'endTime',
      label: $t('hr.attendance.shift.endTime'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: yesNoOptions(),
      },
      defaultValue: 0,
      fieldName: 'crossDay',
      label: $t('hr.attendance.shift.crossDay'),
      rules: 'selectRequired',
      // 跨天班 = 下班时间落在次日，非跨天班要求 end > start
      help: $t('hr.attendance.shift.crossDayTip'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        max: 1440,
        min: 1,
      },
      defaultValue: 480,
      fieldName: 'workMinutes',
      label: $t('hr.attendance.shift.workMinutes'),
      rules: 'required',
      // 后端逐日封顶值 = workMinutes，超出窗口会让请假时长 / 加班校验畸变
      help: $t('hr.attendance.shift.windowTip'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
      defaultValue: 60,
      fieldName: 'restMinutes',
      label: $t('hr.attendance.shift.restMinutes'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
      defaultValue: 0,
      fieldName: 'lateToleranceMinutes',
      label: $t('hr.attendance.shift.lateToleranceMinutes'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: yesNoOptions(),
      },
      defaultValue: 1,
      fieldName: 'needClock',
      label: $t('hr.attendance.shift.needClock'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        // 值域来自平台字典 `status`（1 启用 / 0 停用）
        options: enabledStatusOptions(),
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('hr.attendance.shift.status'),
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

/** 班次搜索表单 schema：关键字（编码 / 名称模糊）+ 状态，与 `ShiftListReq` 一一对应 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('hr.attendance.shift.keywordTip'),
      },
      fieldName: 'keyword',
      label: $t('hr.attendance.shift.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: enabledStatusOptions(),
      },
      fieldName: 'status',
      label: $t('hr.attendance.shift.status'),
    },
  ];
}

/**
 * 班次列表列配置：窗口 / 时长列由响应字段派生展示；
 * 状态为只读标签（班次无独立启停端点，状态经编辑表单全量提交变更）；
 * 操作列权限码 hr:attendance-shift:update / hr:attendance-shift:delete。
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrAttendanceShiftApi.Shift>,
): VxeTableGridColumns<HrAttendanceShiftApi.Shift> {
  return [
    {
      field: 'shiftCode',
      title: $t('hr.attendance.shift.shiftCode'),
      width: 140,
    },
    {
      field: 'shiftName',
      title: $t('hr.attendance.shift.shiftName'),
      width: 140,
    },
    {
      // 上下班窗口：以 startTime 为字段名，展示 `start ~ end`（跨天班标注次日）
      field: 'startTime',
      formatter: ({ row }: { row: HrAttendanceShiftApi.Shift }) =>
        `${row.startTime} ~ ${row.endTime}${
          row.crossDay === 1 ? ` ${$t('hr.attendance.shift.crossDayMark')}` : ''
        }`,
      title: $t('hr.attendance.shift.window'),
      width: 200,
    },
    {
      cellRender: { name: 'CellTag', options: yesNoOptions() },
      field: 'crossDay',
      title: $t('hr.attendance.shift.crossDay'),
      width: 100,
    },
    {
      field: 'workMinutes',
      formatter: ({ cellValue }: { cellValue: number }) =>
        formatMinutes(cellValue),
      title: $t('hr.attendance.shift.workMinutes'),
      width: 130,
    },
    {
      field: 'restMinutes',
      formatter: ({ cellValue }: { cellValue: number }) =>
        formatMinutes(cellValue),
      title: $t('hr.attendance.shift.restMinutes'),
      width: 130,
    },
    {
      field: 'lateToleranceMinutes',
      formatter: ({ cellValue }: { cellValue: number }) =>
        formatMinutes(cellValue),
      title: $t('hr.attendance.shift.lateToleranceMinutes'),
      width: 120,
    },
    {
      cellRender: { name: 'CellTag', options: yesNoOptions() },
      field: 'needClock',
      title: $t('hr.attendance.shift.needClock'),
      width: 100,
    },
    {
      cellRender: { name: 'CellTag', options: enabledStatusOptions() },
      field: 'status',
      title: $t('hr.attendance.shift.status'),
      width: 100,
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'shiftName',
          nameTitle: $t('hr.attendance.shift.shiftName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { auth: 'hr:attendance-shift:update', code: 'edit' },
          {
            auth: 'hr:attendance-shift:delete',
            code: 'delete',
            // 软删主表：班次被历史排班引用，删除只影响后续选班
            confirmTitle: (row: HrAttendanceShiftApi.Shift) =>
              $t('hr.attendance.shift.deleteConfirmTip', [row.shiftName]),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.attendance.shift.operation'),
      width: 140,
    },
  ];
}
