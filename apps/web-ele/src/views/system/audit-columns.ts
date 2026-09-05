import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { $t } from '#/locales';

/**
 * 审计字段公共列：创建人 / 创建时间 / 更新人 / 更新时间。
 * 在各模块 useColumns() 的操作列前展开使用；时间列走全局 formatDateTime formatter。
 * 仅适用于可编辑实体；操作日志 / 登录日志等只追加记录不使用。
 */
export function useAuditColumns<T>(): NonNullable<VxeTableGridColumns<T>> {
  return [
    {
      field: 'created_by_name',
      title: $t('system.common.createdBy'),
      width: 110,
    },
    {
      field: 'created_at',
      formatter: 'formatDateTime',
      title: $t('system.common.createdAt'),
      width: 170,
    },
    {
      field: 'updated_by_name',
      title: $t('system.common.updatedBy'),
      width: 110,
    },
    {
      field: 'updated_at',
      formatter: 'formatDateTime',
      title: $t('system.common.updatedAt'),
      width: 170,
    },
  ];
}
