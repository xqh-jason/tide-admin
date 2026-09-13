import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { LoginLogApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

/**
 * 登录日志结果选项（字典 execResultStatus：1 成功 / 0 失败，
 * 与 sys_job_log 执行日志共用；标签配色来自字典项 extend）
 */
function useResultStatusOptions() {
  return useDictOptions('execResultStatus');
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('system.loginLog.username'),
    },
    {
      component: 'Input',
      fieldName: 'ip',
      label: $t('system.loginLog.ip'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: useResultStatusOptions(),
      },
      fieldName: 'status',
      label: $t('system.loginLog.status'),
    },
  ];
}

export function useColumns(): VxeTableGridColumns<LoginLogApi.LoginLog> {
  return [
    { field: 'username', title: $t('system.loginLog.username'), width: 130 },
    { field: 'ip', title: $t('system.loginLog.ip'), width: 150 },
    {
      cellRender: {
        name: 'CellTag',
        options: useResultStatusOptions(),
      },
      field: 'status',
      title: $t('system.loginLog.status'),
      width: 100,
    },
    {
      field: 'msg',
      minWidth: 160,
      showOverflow: true,
      title: $t('system.loginLog.msg'),
    },
    {
      field: 'agent',
      minWidth: 180,
      showOverflow: true,
      title: $t('system.loginLog.agent'),
    },
    // 登录日志为只追加记录，无更新语义；用户名列已在前，故只保留登录时间
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('system.loginLog.createdAt'),
      width: 170,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('system.loginLog.operation'),
      width: 120,
    },
  ];
}
