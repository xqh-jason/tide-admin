import type { FormCodec } from '@vben/common-ui';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrTimeOffRequestApi, HrTimeOffTypeApi } from '#/api';

import { getAllTimeOffTypesApi } from '#/api';
import { $t } from '#/locales';

import { useEmployeeSelectProps } from '../../shared/employee-select';
import { formatMinutes } from '../../shared/format';
import { approvalStatusOptions } from '../../shared/options';

/**
 * 请假申请页（**HR 管理视角，只读**）的搜索项 / 列定义。
 *
 * 契约要点（对齐后端 `TimeOffRequestListReq`）：
 * - 过滤字段只有 `employeeId` / `timeOffTypeId` / `status` / `startAtBegin` /
 *   `startAtEnd`，**没有审计过滤字段**，故不挂 `useAuditSearchSchema`；
 * - 请假开始时间范围在表单里是一个 `daterange` 值，提交时经下方 `startAtRangeCodec`
 *   拆成 `startAtBegin` / `startAtEnd`（后端两端的纯日期都按 00:00:00 解析，
 *   故止端补 `23:59:59`，否则当天记录会被漏掉）；
 * - `durationMinutes` 由后端按「排班 × 工作日历」派生，只读展示。
 *
 * 本页**不做写操作**：后端 `update` / `submit` / `cancel` / `delete` 在 service 内
 * 先 `ensure_request_owner`（单据归属必须是登录用户本人的档案），HR 视角代操作必被拒。
 */
export const startAtRangeCodec: FormCodec = {
  decode(values) {
    const result = { ...values };
    const start = result.startAtBegin;
    const end = result.startAtEnd;
    if (start === undefined && end === undefined) return result;
    // 还原为日期选择器的 yyyy-MM-dd 值格式（后端回传的可能是完整时间）
    result.startAt = [start?.slice(0, 10), end?.slice(0, 10)].filter(
      (item) => item !== undefined,
    );
    Reflect.deleteProperty(result, 'startAtBegin');
    Reflect.deleteProperty(result, 'startAtEnd');
    return result;
  },
  encode(values) {
    const result = { ...values };
    const range = result.startAt as [string, string] | undefined;
    Reflect.deleteProperty(result, 'startAt');
    if (!range) return result;
    const [start, end] = range;
    // 后端对纯日期按 00:00:00 解析（起止一视同仁），止端补到当日最后一秒
    result.startAtBegin = start ? `${start} 00:00:00` : undefined;
    result.startAtEnd = end ? `${end} 23:59:59` : undefined;
    return result;
  },
};

/** 请假单搜索项：员工 / 假期类型 / 状态 / 请假开始时间范围（空值不下发） */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        ...useEmployeeSelectProps($t('hr.timeOff.request.employeeTip')),
      },
      fieldName: 'employeeId',
      label: $t('hr.timeOff.request.employee'),
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
      label: $t('hr.timeOff.request.timeOffType'),
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
      // 请假开始时间范围，经 startAtRangeCodec 拆为 startAtBegin/End
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'startAt',
      label: $t('hr.timeOff.request.startAt'),
    },
  ];
}

/**
 * 请假单列（管理视角）：状态列与实例状态同一值域与文案（共享 `approvalStatusOptions`）；
 * 审批进度在详情抽屉内由共享 `<ApprovalProgress>` 渲染
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrTimeOffRequestApi.TimeOffRequest>,
): VxeTableGridColumns<HrTimeOffRequestApi.TimeOffRequest> {
  return [
    { field: 'id', title: $t('hr.timeOff.request.id'), width: 80 },
    {
      field: 'employeeName',
      title: $t('hr.timeOff.request.employee'),
      width: 120,
    },
    {
      field: 'timeOffTypeName',
      title: $t('hr.timeOff.request.timeOffType'),
      width: 130,
    },
    {
      field: 'startAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.request.startAt'),
      width: 170,
    },
    {
      field: 'endAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.request.endAt'),
      width: 170,
    },
    {
      align: 'right',
      field: 'durationMinutes',
      formatter: ({ cellValue }: { cellValue: number }) =>
        formatMinutes(cellValue),
      title: $t('hr.timeOff.request.durationMinutes'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: approvalStatusOptions() },
      field: 'status',
      title: $t('hr.common.approvalStatus'),
      width: 100,
    },
    {
      field: 'reason',
      minWidth: 180,
      showOverflow: true,
      title: $t('hr.timeOff.request.reason'),
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.request.createdAt'),
      width: 170,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'employeeName',
          nameTitle: $t('hr.timeOff.request.employee'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        // 只读页：唯一行内操作是查看单据 + 审批进度
        options: [{ code: 'detail', text: $t('hr.timeOff.request.detail') }],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.timeOff.request.operation'),
      width: 110,
    },
  ];
}
