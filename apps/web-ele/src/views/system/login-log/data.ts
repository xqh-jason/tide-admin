import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { LoginLogApi } from '#/api';

import { $t } from '#/locales';

/** 登录日志搜索表单 schema */
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
        options: [
          { label: $t('system.loginLog.success'), value: 1 },
          { label: $t('system.loginLog.fail'), value: 0 },
        ],
      },
      fieldName: 'status',
      label: $t('system.loginLog.status'),
    },
  ];
}

/** 登录日志列表列配置 */
export function useColumns(): VxeTableGridColumns<LoginLogApi.LoginLog> {
  return [
    { field: 'username', title: $t('system.loginLog.username'), width: 130 },
    { field: 'ip', title: $t('system.loginLog.ip'), width: 150 },
    {
      cellRender: {
        name: 'CellTag',
        options: [
          { label: $t('system.loginLog.success'), type: 'success', value: 1 },
          { label: $t('system.loginLog.fail'), type: 'danger', value: 0 },
        ],
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
      field: 'created_at',
      formatter: 'formatDateTime',
      title: $t('system.loginLog.createdAt'),
      width: 170,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('system.loginLog.operation'),
      width: 120,
    },
  ];
}
