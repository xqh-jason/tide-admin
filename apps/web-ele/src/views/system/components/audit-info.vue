<script lang="ts" setup>
import type { AuditFields } from '#/api/system/types';

import { computed } from 'vue';

import { formatDateTime } from '@vben/utils';

import { ElDescriptions, ElDescriptionsItem } from 'element-plus';

import { $t } from '#/locales';

/**
 * 审计信息只读展示：创建人/创建时间/更新人/更新时间。
 * 用于新增/编辑抽屉，编辑态传入行记录，新增态不传即不渲染。
 */
const props = defineProps<{ record?: null | Partial<AuditFields> }>();

const visible = computed(() =>
  Boolean(props.record?.createdAt || props.record?.updatedAt),
);

const formatTime = (value?: string) => (value ? formatDateTime(value) : '-');
</script>

<template>
  <ElDescriptions v-if="visible" :column="2" border class="mt-4" size="small">
    <ElDescriptionsItem :label="$t('system.common.createdBy')">
      {{ record?.createdByName || '-' }}
    </ElDescriptionsItem>
    <ElDescriptionsItem :label="$t('system.common.createdAt')">
      {{ formatTime(record?.createdAt) }}
    </ElDescriptionsItem>
    <ElDescriptionsItem :label="$t('system.common.updatedBy')">
      {{ record?.updatedByName || '-' }}
    </ElDescriptionsItem>
    <ElDescriptionsItem :label="$t('system.common.updatedAt')">
      {{ formatTime(record?.updatedAt) }}
    </ElDescriptionsItem>
  </ElDescriptions>
</template>
