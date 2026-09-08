import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemJobApi, SystemJobLogApi } from '#/api';

import { z } from '#/adapter/form';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/**
 * 处理器下拉选项（后端 task 注册表白名单）：
 * 后端无获取列表的接口，新增 handler 时需在此同步
 */
export function useHandlerOptions() {
  return [
    {
      label: $t('system.job.handlerCleanupLoginLogs'),
      value: 'cleanup_login_logs',
    },
    {
      label: $t('system.job.handlerCleanupJobLogs'),
      value: 'cleanup_job_logs',
    },
  ];
}

/** 执行日志状态选项（字典 cronJobStatus：1 成功 / 0 失败，与启停的 status 字典区分） */
export function useLogStatusOptions() {
  return useDictOptions('cronJobStatus');
}

/** cron 校验：6 段秒级表达式格式兜底，语义合法性由后端解析校验 */
const cronSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((val) => val.trim().split(/\s+/).length === 6, {
    message: $t('system.job.cronInvalid'),
  });

/**
 * 新增/编辑定时任务表单 schema
 */
export function useFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
      },
      fieldName: 'jobName',
      label: $t('system.job.jobName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: '0 0 3 * * *',
      },
      fieldName: 'cronExpr',
      help: $t('system.job.cronTip'),
      label: $t('system.job.cronExpr'),
      rules: cronSchema,
    },
    {
      component: 'Select',
      componentProps: {
        options: useHandlerOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
      fieldName: 'handlerName',
      label: $t('system.job.handlerName'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.job.status'),
      rules: 'selectRequired',
      defaultValue: 1,
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'remark',
      label: $t('system.job.remark'),
    },
  ];
}

/** 任务搜索表单 schema：名称模糊 + 状态 */
export function useGridFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      fieldName: 'jobName',
      label: $t('system.job.jobName'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.job.status'),
    },
  ];
}

/**
 * 任务列表列配置：审计列复用公共 useAuditColumns，
 * status 列为启停开关（需 system:job:update-status 权限码，切换前二次确认）
 */
export function useColumns(
  onStatusChange: (newVal: number, row: SystemJobApi.Job) => Promise<boolean>,
): VxeTableGridColumns<SystemJobApi.Job> {
  const statusOptions = useDictOptions('status');
  return [
    { field: 'jobName', title: $t('system.job.jobName'), width: 160 },
    {
      field: 'cronExpr',
      minWidth: 150,
      showOverflow: true,
      title: $t('system.job.cronExpr'),
    },
    {
      field: 'handlerName',
      title: $t('system.job.handlerName'),
      width: 160,
    },
    {
      cellRender: {
        attrs: {
          auth: 'system:job:update-status',
          beforeChange: onStatusChange,
        },
        name: 'CellSwitch',
        options: statusOptions,
      },
      field: 'status',
      title: $t('system.job.status'),
      width: 100,
    },
    {
      field: 'remark',
      minWidth: 140,
      showOverflow: true,
      title: $t('system.job.remark'),
    },
    ...useAuditColumns<SystemJobApi.Job>(),
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('system.job.operation'),
      width: 230,
    },
  ];
}

/** 执行日志列配置：只追加记录，无审计列；勾选列支持批量删除 */
export function useLogColumns(): VxeTableGridColumns<SystemJobLogApi.JobLog> {
  return [
    { type: 'checkbox', width: 50 },
    {
      cellRender: {
        name: 'CellTag',
        options: useLogStatusOptions(),
      },
      field: 'status',
      title: $t('system.job.logStatus'),
      width: 90,
    },
    {
      field: 'errorMsg',
      formatter: ({ cellValue }) => cellValue || '-',
      minWidth: 220,
      showOverflow: true,
      title: $t('system.job.errorMsg'),
    },
    {
      field: 'durationMs',
      formatter: ({ cellValue }) => `${cellValue ?? 0} ms`,
      title: $t('system.job.durationMs'),
      width: 110,
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('system.common.createdAt'),
      width: 170,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('system.job.operation'),
      width: 90,
    },
  ];
}

/** 执行日志搜索表单 schema：仅执行结果（任务由打开的行固定，不进搜索表单） */
export function useLogGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: useLogStatusOptions(),
      },
      fieldName: 'status',
      label: $t('system.job.logStatus'),
    },
  ];
}
