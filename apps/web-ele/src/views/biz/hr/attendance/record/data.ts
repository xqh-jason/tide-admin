import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrAttendanceRecordApi } from '#/api';
import type { DictOption } from '#/store';

import { $t } from '#/locales';

import { useEmployeeSelectProps } from '../../shared/employee-select';
import { formatMinutes } from '../../shared/format';
import { formatShiftName } from '../schedule/data';

/**
 * 出勤记录页的搜索项 / 列定义 / 枚举选项。
 *
 * 契约要点（对齐后端 `hr/attendance/dto.rs` 与 `attendance/mod.rs`）：
 * - 列表过滤走 `RecordListReq`：`employeeId` / `source` / `missClock` /
 *   `workDateBegin` / `workDateEnd`；
 * - 来源值域 = `mod.rs` 的 `SOURCES`（1 导入 / 2 手工补录 / 3 设备 / 4 钉钉 / 5 飞书）；
 * - 缺卡值域 = `MISS_CLOCK_*`（0 无 / 1 缺上班卡 / 2 缺下班卡 / 3 上下班卡都缺）；
 * - 迟到 / 早退 / 实际出勤都是服务端按当日班次窗口回算的分钟数，前端只做展示
 *   （`formatMinutes`），不做任何本地推算。
 */

/** 出勤来源选项（1 导入 / 2 手工补录 / 3 设备 / 4 钉钉 / 5 飞书） */
export function sourceOptions(): DictOption[] {
  return [
    {
      label: $t('hr.attendance.record.sourceImport'),
      type: 'primary',
      value: 1,
    },
    {
      label: $t('hr.attendance.record.sourceManual'),
      type: 'success',
      value: 2,
    },
    { label: $t('hr.attendance.record.sourceDevice'), type: 'info', value: 3 },
    {
      label: $t('hr.attendance.record.sourceDingtalk'),
      type: 'warning',
      value: 4,
    },
    {
      label: $t('hr.attendance.record.sourceFeishu'),
      type: 'warning',
      value: 5,
    },
  ];
}

/** 缺卡情况选项（0 无 / 1 缺上班卡 / 2 缺下班卡 / 3 上下班卡都缺） */
export function missClockOptions(): DictOption[] {
  return [
    {
      label: $t('hr.attendance.record.missClockNone'),
      type: 'success',
      value: 0,
    },
    {
      label: $t('hr.attendance.record.missClockIn'),
      type: 'danger',
      value: 1,
    },
    {
      label: $t('hr.attendance.record.missClockOut'),
      type: 'danger',
      value: 2,
    },
    {
      label: $t('hr.attendance.record.missClockBoth'),
      type: 'danger',
      value: 3,
    },
  ];
}

/** 出勤记录搜索项：员工 / 来源 / 缺卡 / 出勤日区间 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: useEmployeeSelectProps(
        $t('hr.attendance.record.employeeTip'),
      ),
      fieldName: 'employeeId',
      label: $t('hr.attendance.record.employee'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: sourceOptions(),
      },
      fieldName: 'source',
      label: $t('hr.attendance.record.source'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: missClockOptions(),
      },
      fieldName: 'missClock',
      label: $t('hr.attendance.record.missClock'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'workDateBegin',
      label: $t('hr.attendance.record.workDateBegin'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'workDateEnd',
      label: $t('hr.attendance.record.workDateEnd'),
    },
  ];
}

/**
 * 出勤记录列表列配置。
 * 事实表不软删且没有删除端点，操作列只提供「补录」（需 hr:attendance-record:update）
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrAttendanceRecordApi.Record>,
): VxeTableGridColumns<HrAttendanceRecordApi.Record> {
  return [
    {
      field: 'employeeName',
      title: $t('hr.attendance.record.employee'),
      width: 120,
    },
    {
      field: 'workDate',
      title: $t('hr.attendance.record.workDate'),
      width: 120,
    },
    {
      field: 'shiftName',
      // 班次是写入时的事实快照：shiftId = 0 即当天休息
      formatter: ({ row }) => formatShiftName(row),
      minWidth: 130,
      showOverflow: true,
      title: $t('hr.attendance.record.shift'),
    },
    {
      field: 'clockIn',
      formatter: 'formatDateTime',
      title: $t('hr.attendance.record.clockIn'),
      width: 170,
    },
    {
      field: 'clockOut',
      formatter: 'formatDateTime',
      title: $t('hr.attendance.record.clockOut'),
      width: 170,
    },
    {
      field: 'actualMinutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('hr.attendance.record.actualMinutes'),
      width: 120,
    },
    {
      field: 'lateMinutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('hr.attendance.record.lateMinutes'),
      width: 110,
    },
    {
      field: 'earlyLeaveMinutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('hr.attendance.record.earlyLeaveMinutes'),
      width: 110,
    },
    {
      cellRender: { name: 'CellTag', options: missClockOptions() },
      field: 'missClock',
      title: $t('hr.attendance.record.missClock'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: sourceOptions() },
      field: 'source',
      title: $t('hr.attendance.record.source'),
      width: 110,
    },
    {
      field: 'externalId',
      formatter: ({ cellValue }) => cellValue || '-',
      minWidth: 140,
      showOverflow: true,
      title: $t('hr.attendance.record.externalId'),
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    {
      field: 'updatedAt',
      formatter: 'formatDateTime',
      title: $t('hr.attendance.record.updatedAt'),
      width: 170,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'employeeName',
          nameTitle: $t('hr.attendance.record.employee'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            auth: 'hr:attendance-record:update',
            code: 'update',
            text: $t('hr.attendance.record.makeup'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.attendance.record.operation'),
      width: 110,
    },
  ];
}
