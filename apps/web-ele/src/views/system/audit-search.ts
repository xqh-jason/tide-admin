import type { VbenFormSchema } from '#/adapter/form';
import type { SystemUserApi } from '#/api';

import { getAllUsersApi } from '#/api';
import { $t } from '#/locales';

/** 审计时间范围字段到请求参数（Begin/End）的映射，列表页 formOptions.fieldMappingTime 使用 */
export const auditFieldMappingTime: [string, [string, string], string][] = [
  ['createdAt', ['createdAtBegin', 'createdAtEnd'], 'YYYY-MM-DD HH:mm:ss'],
  ['updatedAt', ['updatedAtBegin', 'updatedAtEnd'], 'YYYY-MM-DD HH:mm:ss'],
];

/**
 * 审计字段公共搜索项：创建人/更新人（用户选择器，软删用户置灰）+
 * 创建/更新时间范围。仅适用于带审计列的实体列表；
 * 时间范围经 fieldMappingTime 拆为 createdAtBegin/End 等请求参数。
 */
export function useAuditSearchSchema(): VbenFormSchema[] {
  const userSelect = {
    component: 'ApiSelect',
    componentProps: {
      afterFetch: (items: SystemUserApi.UserBrief[]) =>
        items.map((user) => ({
          // 软删用户仅作审计筛选的历史数据源，禁选避免新数据挂到已删用户
          disabled: user.deleted,
          label: user.username,
          value: user.id,
        })),
      api: getAllUsersApi,
      clearable: true,
      filterable: true,
    },
  };
  const datetimeRange = {
    component: 'DatePicker',
    componentProps: {
      type: 'datetimerange',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
    },
  };
  return [
    {
      ...userSelect,
      fieldName: 'createdBy',
      label: $t('system.common.createdBy'),
    },
    {
      ...datetimeRange,
      fieldName: 'createdAt',
      label: $t('system.common.createdAt'),
    },
    {
      ...userSelect,
      fieldName: 'updatedBy',
      label: $t('system.common.updatedBy'),
    },
    {
      ...datetimeRange,
      fieldName: 'updatedAt',
      label: $t('system.common.updatedAt'),
    },
  ];
}
