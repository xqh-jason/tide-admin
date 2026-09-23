import type { UploadRequestOptions } from 'element-plus';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrOvertimeApi } from '#/api';
import type { DictOption } from '#/store';

import { $t } from '#/locales';
import {
  ATTACHMENT_ACCEPT,
  uploadHrAttachment,
} from '#/views/biz/hr/shared/attachment';
import { useEmployeeSelectProps } from '#/views/biz/hr/shared/employee-select';
import { formatMinutes } from '#/views/biz/hr/shared/format';
import { approvalStatusOptions } from '#/views/biz/hr/shared/options';

/**
 * 加班申请抽屉入参：创建态由 index.vue 解析当前账号档案后注入，
 * 编辑态带行数据（抽屉内再拉一次详情回显）。
 */
export interface OvertimeFormData {
  /** 本人员工档案 ID（写入口一律「本人」，后端拒绝替他人建单） */
  employeeId: number;
  /** 本人显示名（只读展示） */
  employeeName: string;
  /** 编辑态行数据；创建态为 null（建单即提交，无草稿态） */
  record: HrOvertimeApi.Overtime | null;
}

/** 加班类型选项（后端 `mod.rs` OVERTIME_TYPES 唯一定义点：1 工作日 / 2 休息日 / 3 法定节假日） */
export function overtimeTypeOptions(): DictOption[] {
  return [
    { label: $t('hr.overtime.typeWorkday'), type: 'primary', value: 1 },
    { label: $t('hr.overtime.typeRestDay'), type: 'warning', value: 2 },
    { label: $t('hr.overtime.typeHoliday'), type: 'danger', value: 3 },
  ];
}

/** 补偿方式选项（后端 `mod.rs` COMP_MODES 唯一定义点：1 转调休 / 2 计加班费） */
export function compModeOptions(): DictOption[] {
  return [
    { label: $t('hr.overtime.compTimeOff'), type: 'success', value: 1 },
    { label: $t('hr.overtime.compPay'), type: 'info', value: 2 },
  ];
}

/**
 * 查询范围选项：`mine 我的申请`（默认，走 `/hr/overtime/mine`，后端按当前账号档案过滤）
 * / `all 全部申请`（管理视角，走 `/hr/overtime/list`）
 */
export function scopeOptions(): DictOption[] {
  return [
    { label: $t('hr.overtime.scopeMine'), value: 'mine' },
    { label: $t('hr.overtime.scopeAll'), value: 'all' },
  ];
}

/**
 * 新建/编辑表单 schema。
 *
 * 契约要点（对齐后端 `CreateOvertimeReq` / `UpdateOvertimeReq`）：
 * - **没有时长字段**：`durationMinutes` 由后端按起止时间派生（区间总长，不裁剪到班次窗口）；
 * - 起止时间与「加班日期」必须同一天（后端拒绝跨天），故表单只填日期 + 时间区间，
 *   提交时由抽屉拼成 `yyyy-MM-dd HH:mm:ss`；
 * - `overtimeType` 必须与当日应出勤性匹配、工作日加班不得与应工作时段重叠（后端校验）；
 * - 归属（`employeeId`）不在表单内，由页面注入（创建态 = 本人档案，编辑态 = 行数据）。
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'workDate',
      label: $t('hr.overtime.workDate'),
      rules: 'selectRequired',
    },
    {
      component: 'TimePicker',
      componentProps: {
        isRange: true,
        valueFormat: 'HH:mm:ss',
      },
      fieldName: 'timeRange',
      help: $t('hr.overtime.timeRangeTip'),
      label: $t('hr.overtime.timeRange'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        options: overtimeTypeOptions(),
      },
      fieldName: 'overtimeType',
      help: $t('hr.overtime.overtimeTypeTip'),
      label: $t('hr.overtime.overtimeType'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        options: compModeOptions(),
      },
      fieldName: 'compMode',
      help: $t('hr.overtime.compModeTip'),
      label: $t('hr.overtime.compMode'),
      rules: 'selectRequired',
    },
    {
      component: 'Textarea',
      componentProps: {
        // 列宽 VARCHAR(255)，与后端 validate.rs 的上限一致
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'reason',
      label: $t('hr.overtime.reason'),
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
 * 搜索表单 schema：范围（mine / all）为端点开关，其余筛选只在管理视角可见。
 * 本人视角端点（`MineReq`）只接受状态过滤，员工 / 类型 / 日期区间由查询回调按范围裁剪。
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        options: scopeOptions(),
      },
      defaultValue: 'mine',
      fieldName: 'scope',
      label: $t('hr.overtime.scope'),
    },
    {
      component: 'ApiSelect',
      componentProps: useEmployeeSelectProps($t('ui.placeholder.select')),
      dependencies: {
        show: (values) => values.scope === 'all',
        triggerFields: ['scope'],
      },
      fieldName: 'employeeId',
      label: $t('hr.common.applicant'),
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
      component: 'Select',
      componentProps: {
        clearable: true,
        options: overtimeTypeOptions(),
      },
      dependencies: {
        show: (values) => values.scope === 'all',
        triggerFields: ['scope'],
      },
      fieldName: 'overtimeType',
      label: $t('hr.overtime.overtimeType'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      dependencies: {
        show: (values) => values.scope === 'all',
        triggerFields: ['scope'],
      },
      fieldName: 'workDateRange',
      label: $t('hr.overtime.workDate'),
    },
  ];
}

/**
 * 列表列配置：状态 / 类型 / 补偿方式用 CellTag 渲染，时长用共享 `formatMinutes`，
 * 时间列走全局 `formatDateTime`；操作列为 VbenTableAction 插槽（权限码 + 状态机显隐在 index.vue）。
 * 本列表请求（`OvertimeListReq`）不支持审计字段过滤，故不接公共审计搜索项。
 */
export function useColumns(): VxeTableGridColumns<HrOvertimeApi.Overtime> {
  return [
    { field: 'employeeName', title: $t('hr.common.applicant'), width: 110 },
    { field: 'workDate', title: $t('hr.overtime.workDate'), width: 120 },
    {
      field: 'startAt',
      formatter: 'formatDateTime',
      title: $t('hr.overtime.startAt'),
      width: 170,
    },
    {
      field: 'endAt',
      formatter: 'formatDateTime',
      title: $t('hr.overtime.endAt'),
      width: 170,
    },
    {
      field: 'durationMinutes',
      formatter: ({ cellValue }) => formatMinutes(cellValue),
      title: $t('hr.overtime.duration'),
      width: 130,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: overtimeTypeOptions(),
      },
      field: 'overtimeType',
      title: $t('hr.overtime.overtimeType'),
      width: 110,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: compModeOptions(),
      },
      field: 'compMode',
      title: $t('hr.overtime.compMode'),
      width: 110,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: approvalStatusOptions(),
      },
      field: 'status',
      title: $t('hr.common.approvalStatus'),
      width: 100,
    },
    {
      field: 'reason',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.overtime.reason'),
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('hr.common.submittedAt'),
      width: 170,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('hr.overtime.operation'),
      width: 300,
    },
  ];
}
