import type { UploadRequestOptions } from 'element-plus';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrTimeOffRequestApi, HrTimeOffTypeApi } from '#/api';

import { getAllTimeOffTypesApi } from '#/api';
import { $t } from '#/locales';

import { ATTACHMENT_ACCEPT, uploadHrAttachment } from '../../shared/attachment';
import { formatMinutes } from '../../shared/format';
import { approvalStatusOptions } from '../../shared/options';

/**
 * 我的请假页（**本人全操作**）的表单 / 搜索项 / 列定义。
 *
 * 状态机（值域唯一定义点：后端 `hr_time_off/mod.rs` 的 `REQUEST_STATUS_*`，
 * 准入判定在 service 内，且**每个写操作都要求「单据归属 = 本人」**）：
 * - 1 审批中：仅可 `cancel`（撤销后预占额度由审批侧终态分派释放回账户）；
 * - 2 已通过：已实扣，不可改 / 不可重提；仅可 `delete`（软删，账户流水不受影响）；
 * - 3 已驳回 / 4 已撤销：可 `update` 改单、`submit` 重提（重提会重新派生时长、
 *   预占额度并起**新**审批实例），也可 `delete`；
 * - 「审批中」不可 `delete`（后端要求先撤销）。
 *
 * 创建（建单即提交）契约（对齐后端 `CreateTimeOffRequestReq`）：
 * - `employeeId` 必须是**本人档案 ID**（由抽屉内 `resolveMyEmployee()` 取，取不到即中止）；
 * - 请求体**不传 `durationMinutes`**（后端按「排班 × 工作日历」派生，防伪造）；
 * - 起止时间传 `yyyy-MM-dd HH:mm:ss`（DatePicker `datetimerange` 的 valueFormat）。
 */

/** 请假单状态常量（后端 `REQUEST_STATUS_*`）：1 审批中 / 2 已通过 / 3 已驳回 / 4 已撤销 */
const STATUS_PENDING = 1;
const STATUS_REJECTED = 3;
const STATUS_CANCELED = 4;

/** 我的请假单搜索项：仅状态（后端 `MineTimeOffRequestReq` 不收 `employeeId`，身份由登录用户推导） */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: approvalStatusOptions(),
      },
      fieldName: 'status',
      label: $t('hr.common.approvalStatus'),
    },
  ];
}

/**
 * 新建 / 修改请假单表单 schema。
 * `timeRange` 是控件值（`datetimerange` 数组），提交时在抽屉内拆为
 * `startAt` / `endAt` 两个字段。
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
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
      label: $t('hr.timeOff.myRequest.timeOffType'),
      rules: 'selectRequired',
    },
    {
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD HH:mm:ss',
        type: 'datetimerange',
        // 后端要求 `yyyy-MM-dd HH:mm:ss`（完整秒）
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'timeRange',
      label: $t('hr.timeOff.myRequest.timeRange'),
      rules: 'selectRequired',
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'reason',
      label: $t('hr.timeOff.myRequest.reason'),
      rules: 'required',
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
    {
      component: 'Upload',
      componentProps: {
        accept: ATTACHMENT_ACCEPT,
        // 覆盖默认 XHR 上传：走后端 /file/upload（multipart，字段名固定 file），
        // 返回的文件记录由 Element Plus 挂在 file.response 上，提交时取 id
        httpRequest: (options: UploadRequestOptions) =>
          uploadHrAttachment(options.file as File),
        limit: 1,
      },
      fieldName: 'attachment',
      help: $t('hr.common.attachmentTip'),
      label: $t('hr.common.attachment'),
    },
  ];
}

/**
 * 我的请假单列：状态列与审批实例同一值域与文案；行内操作按状态机 + 权限码过滤
 * （`show` 不成立的按钮不渲染，权限码不成立的按钮由渲染器过滤）
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrTimeOffRequestApi.TimeOffRequest>,
): VxeTableGridColumns<HrTimeOffRequestApi.TimeOffRequest> {
  return [
    { field: 'id', title: $t('hr.timeOff.myRequest.id'), width: 80 },
    {
      field: 'timeOffTypeName',
      title: $t('hr.timeOff.myRequest.timeOffType'),
      width: 130,
    },
    {
      field: 'startAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.myRequest.startAt'),
      width: 170,
    },
    {
      field: 'endAt',
      formatter: 'formatDateTime',
      title: $t('hr.timeOff.myRequest.endAt'),
      width: 170,
    },
    {
      align: 'right',
      field: 'durationMinutes',
      formatter: ({ cellValue }: { cellValue: number }) =>
        formatMinutes(cellValue),
      title: $t('hr.timeOff.myRequest.durationMinutes'),
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
      title: $t('hr.timeOff.myRequest.reason'),
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'timeOffTypeName',
          nameTitle: $t('hr.timeOff.myRequest.timeOffType'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          // 修改 / 重提：仅「已驳回 / 已撤销」
          {
            auth: 'hr:time-off-request:update',
            code: 'edit',
            show: (row: HrTimeOffRequestApi.TimeOffRequest) =>
              row.status === STATUS_REJECTED || row.status === STATUS_CANCELED,
            text: $t('hr.timeOff.myRequest.update'),
          },
          {
            auth: 'hr:time-off-request:submit',
            code: 'submit',
            show: (row: HrTimeOffRequestApi.TimeOffRequest) =>
              row.status === STATUS_REJECTED || row.status === STATUS_CANCELED,
            text: $t('hr.timeOff.myRequest.submit'),
          },
          // 撤销：仅「审批中」（撤销后审批侧释放预占额度）
          {
            auth: 'hr:time-off-request:cancel',
            code: 'cancel',
            show: (row: HrTimeOffRequestApi.TimeOffRequest) =>
              row.status === STATUS_PENDING,
            text: $t('hr.timeOff.myRequest.cancel'),
          },
          // 删除：软删；「审批中」必须先撤销（否则后端拒绝）
          {
            auth: 'hr:time-off-request:delete',
            code: 'delete',
            confirmTitle: (row: HrTimeOffRequestApi.TimeOffRequest) =>
              $t('hr.timeOff.myRequest.deleteConfirm', [row.id]),
            show: (row: HrTimeOffRequestApi.TimeOffRequest) =>
              row.status !== STATUS_PENDING,
          },
          // 详情：任何状态都能看（含审批进度）
          {
            code: 'detail',
            text: $t('hr.timeOff.myRequest.detail'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.timeOff.myRequest.operation'),
      width: 230,
    },
  ];
}
