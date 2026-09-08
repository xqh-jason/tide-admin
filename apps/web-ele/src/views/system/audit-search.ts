import type { FormCodec } from '@vben/common-ui';

import type { VbenFormSchema } from '#/adapter/form';
import type { SystemUserApi } from '#/api';

import { formatDate } from '@vben/utils';

import { getAllUsersApi } from '#/api';
import { $t } from '#/locales';

/** 审计时间范围字段与拆分后的请求参数键（Begin/End） */
const auditRangeFields = [
  {
    endKey: 'createdAtEnd',
    field: 'createdAt',
    startKey: 'createdAtBegin',
  },
  {
    endKey: 'updatedAtEnd',
    field: 'updatedAt',
    startKey: 'updatedAtBegin',
  },
] as const;

/**
 * 审计时间范围编解码器（替代废弃的 fieldMappingTime）：
 * encode 将表单的时间范围数组拆为 createdAtBegin/End 等请求参数，
 * 空范围时不下发 Begin/End；decode 反向还原，供 setValues 回填。
 */
export const auditTimeCodec: FormCodec = {
  decode(values) {
    const result = { ...values };
    for (const { endKey, field, startKey } of auditRangeFields) {
      const start = result[startKey];
      const end = result[endKey];
      if (start === undefined && end === undefined) continue;
      result[field] = [start, end].filter((v) => v !== undefined);
      Reflect.deleteProperty(result, startKey);
      Reflect.deleteProperty(result, endKey);
    }
    return result;
  },
  encode(values) {
    const result = { ...values };
    for (const { endKey, field, startKey } of auditRangeFields) {
      const range = result[field];
      Reflect.deleteProperty(result, field);
      if (!range) continue;
      const [start, end] = range;
      result[startKey] = start
        ? formatDate(start, 'YYYY-MM-DD HH:mm:ss')
        : undefined;
      result[endKey] = end ? formatDate(end, 'YYYY-MM-DD HH:mm:ss') : undefined;
    }
    return result;
  },
};

/**
 * 审计字段公共搜索项：创建人/更新人（用户选择器，软删用户置灰）+
 * 创建/更新时间范围。仅适用于带审计列的实体列表；
 * 时间范围经 auditTimeCodec 拆为 createdAtBegin/End 等请求参数。
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
