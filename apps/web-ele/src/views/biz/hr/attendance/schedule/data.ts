import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrAttendanceScheduleApi } from '#/api';
import type { DictOption } from '#/store';

import { getAllAttendanceShiftsApi } from '#/api';
import { $t } from '#/locales';

import { useEmployeeSelectProps } from '../../shared/employee-select';

/**
 * 排班管理页的搜索项 / 列定义 / 枚举选项。
 *
 * 契约要点（对齐后端 `hr/attendance/dto.rs`）：
 * - 列表过滤走 `ScheduleListReq`：`employeeId` / `shiftId` / `status` /
 *   `workDateBegin` / `workDateEnd`（日期传 `yyyy-MM-dd` 字符串）；
 * - `shiftId = 0` 是后端约定的「当天休息」，不是「未排班」；
 * - 排班状态值域来自后端 `attendance/mod.rs` 的 `SCHEDULE_STATUSES`
 *   （1 正常 / 2 已换班），0 未排班只出现在月视图响应里（占位、不落库）；
 * - 排班表不软删，写入即按 `(employeeId, workDate)` upsert。
 */

/** 排班状态选项（1 正常 / 2 已换班），值域同后端 `SCHEDULE_STATUSES` */
export function scheduleStatusOptions(): DictOption[] {
  return [
    {
      label: $t('hr.attendance.schedule.statusNormal'),
      type: 'success',
      value: 1,
    },
    {
      label: $t('hr.attendance.schedule.statusSwapped'),
      type: 'warning',
      value: 2,
    },
  ];
}

/** 「当天休息」选项：后端用 `shiftId = 0` 表达休息（不是未排班占位） */
export function restShiftOption(): DictOption {
  return { label: $t('hr.attendance.schedule.rest'), type: 'info', value: 0 };
}

/**
 * 班次下拉（ApiSelect）通用 componentProps：数据源为班次 list（一次取满），
 * label 带班次编码便于同名班次区分。
 *
 * 「休息」（`shiftId = 0`）是排班域各端点都接受的合法取值（表示当天休息），
 * 但它不是班次表里的行，因此必须在 `afterFetch` 里拼进选项——
 * ApiComponent 的 `options` 只在接口返回空数组时才作为兜底，不会被合并
 */
export function useShiftSelectProps(placeholder?: string) {
  return {
    afterFetch: (
      items: { id: number; shiftCode: string; shiftName: string }[],
    ) => [
      restShiftOption(),
      ...items.map((item) => ({
        label: item.shiftCode
          ? `${item.shiftCode} · ${item.shiftName}`
          : item.shiftName,
        value: item.id,
      })),
    ],
    api: getAllAttendanceShiftsApi,
    clearable: true,
    filterable: true,
    placeholder,
  };
}

/**
 * 排班列表搜索项：员工 / 班次（含「休息」）/ 状态 / 排班日区间。
 * 日期区间用两个独立日期字段，直接对应后端的 `workDateBegin` / `workDateEnd`
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: useEmployeeSelectProps(
        $t('hr.attendance.schedule.employeeTip'),
      ),
      fieldName: 'employeeId',
      label: $t('hr.attendance.schedule.employee'),
    },
    {
      component: 'ApiSelect',
      componentProps: useShiftSelectProps(
        $t('hr.attendance.schedule.shiftTip'),
      ),
      fieldName: 'shiftId',
      label: $t('hr.attendance.schedule.shift'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: scheduleStatusOptions(),
      },
      fieldName: 'status',
      label: $t('hr.attendance.schedule.status'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'workDateBegin',
      label: $t('hr.attendance.schedule.workDateBegin'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'workDateEnd',
      label: $t('hr.attendance.schedule.workDateEnd'),
    },
  ];
}

/**
 * 班次快照展示（排班行 / 出勤事实行共用）：`shiftId = 0` 即当天休息
 * （后端此时不给班次名），班次已软删时名称回退空串
 */
export function formatShiftName(row: { shiftId: number; shiftName: string }) {
  if (row.shiftId === 0) return $t('hr.attendance.schedule.rest');
  return row.shiftName || '-';
}

/**
 * 排班列表列配置。
 * 排班表不软删且无独立详情端点，操作列只提供「调整」（单日 upsert，
 * 需 hr:attendance-schedule:update）
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrAttendanceScheduleApi.Schedule>,
): VxeTableGridColumns<HrAttendanceScheduleApi.Schedule> {
  return [
    {
      field: 'employeeName',
      title: $t('hr.attendance.schedule.employee'),
      width: 120,
    },
    {
      field: 'workDate',
      title: $t('hr.attendance.schedule.workDate'),
      width: 120,
    },
    {
      field: 'shiftName',
      formatter: ({ row }) => formatShiftName(row),
      minWidth: 140,
      showOverflow: true,
      title: $t('hr.attendance.schedule.shift'),
    },
    {
      cellRender: { name: 'CellTag', options: scheduleStatusOptions() },
      field: 'status',
      title: $t('hr.attendance.schedule.status'),
      width: 100,
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.common.remark'),
    },
    {
      field: 'updatedByName',
      title: $t('hr.attendance.schedule.updatedByName'),
      width: 120,
    },
    {
      field: 'updatedAt',
      formatter: 'formatDateTime',
      title: $t('hr.attendance.schedule.updatedAt'),
      width: 170,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'employeeName',
          nameTitle: $t('hr.attendance.schedule.employee'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            auth: 'hr:attendance-schedule:update',
            code: 'update',
            text: $t('hr.attendance.schedule.adjust'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.attendance.schedule.operation'),
      width: 110,
    },
  ];
}
