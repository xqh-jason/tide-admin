import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { OperationLogApi } from '#/api';

import { $t } from '#/locales';

/** 操作日志搜索表单 schema（keyword 命中接口路径） */
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
      component: 'InputNumber',
      componentProps: {
        controls: false,
        min: 100,
        placeholder: '200',
      },
      fieldName: 'status',
      label: $t('system.operationLog.status'),
    },
  ];
}

/** 操作日志列表列配置 */
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
    // 操作日志为只追加记录，无更新语义；后端只回操作人 id，故不走通用审计列
    { field: 'userId', title: $t('system.operationLog.operator'), width: 110 },
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
