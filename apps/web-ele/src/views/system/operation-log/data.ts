import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { OperationLogApi, SystemUserApi } from '#/api';

import { getAllUsersApi } from '#/api';
import { $t } from '#/locales';

/** keyword 命中接口路径 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.operationLog.path'),
      },
      fieldName: 'keyword',
      label: $t('system.operationLog.path'),
    },
    {
      // 操作人：用户选择器，软删用户仅作历史数据筛选、置灰禁选
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: SystemUserApi.UserBrief[]) =>
          items.map((user) => ({
            disabled: user.deleted,
            label: user.username,
            value: user.id,
          })),
        api: getAllUsersApi,
        clearable: true,
        filterable: true,
      },
      fieldName: 'userId',
      label: $t('system.operationLog.operator'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        controls: false,
        min: 100,
        placeholder: '200',
      },
      fieldName: 'status',
      label: $t('system.operationLog.status'),
    },
    {
      // 创建时间范围，提交时经 auditTimeCodec 拆为 createdAtBegin/End
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'createdAt',
      label: $t('system.operationLog.createdAt'),
    },
  ];
}

export function useColumns(): VxeTableGridColumns<OperationLogApi.OperationLog> {
  return [
    { field: 'method', title: $t('system.operationLog.method'), width: 90 },
    {
      field: 'path',
      minWidth: 220,
      showOverflow: true,
      title: $t('system.operationLog.path'),
    },
    { field: 'status', title: $t('system.operationLog.status'), width: 100 },
    {
      field: 'latency',
      formatter: ({ cellValue }) =>
        cellValue === undefined || cellValue === null ? '-' : `${cellValue} ms`,
      title: $t('system.operationLog.latency'),
      width: 110,
    },
    { field: 'ip', title: $t('system.operationLog.ip'), width: 140 },
    // 操作日志为只追加记录，无更新语义；列表操作人姓名由后端 actionByName 返回
    // （软删用户仍能回原名，查不到时展示占位符）
    {
      field: 'actionByName',
      formatter: ({ cellValue }) => cellValue || '-',
      title: $t('system.operationLog.operator'),
      width: 110,
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('system.operationLog.createdAt'),
      width: 170,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('system.operationLog.operation'),
      width: 140,
    },
  ];
}
