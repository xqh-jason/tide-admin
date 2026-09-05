import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { $t } from '#/locales';

/**
 * 审计字段公共列：创建人 / 创建时间 / 更新人 / 更新时间。
 * 在各模块 useColumns() 的操作列前展开使用；时间列走全局 formatDateTime formatter。
 * @param createdAtTitle 覆盖创建时间列标题（如登录日志展示为"登录时间"）
 */
export function useAuditColumns<T>(
  createdAtTitle?: string,
): NonNullable<VxeTableGridColumns<T>> {
  return [
    {
      field: 'created_by_name',
      title: $t('system.common.createdBy'),
      width: 110,
    },
    {
      field: 'created_at',
      formatter: 'formatDateTime',
      title: createdAtTitle ?? $t('system.common.createdAt'),
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
