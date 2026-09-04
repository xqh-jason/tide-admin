<script lang="ts" setup>
import type { OperationLogApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElDescriptions, ElDescriptionsItem } from 'element-plus';

import { getOperationLog } from '#/api';
import { $t } from '#/locales';

defineOptions({ name: 'SystemOperationLogDetail' });

const detail = ref<null | OperationLogApi.OperationLogDetail>(null);

const title = computed(() => $t('system.operationLog.detail'));

const [Drawer, drawerApi] = useVbenDrawer<null | OperationLogApi.OperationLog>({
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = drawerApi.getData();
    detail.value = null;
    if (!data) return;
    detail.value = await getOperationLog(data.id);
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[860px]" :title="title">
    <template v-if="detail">
      <ElDescriptions :column="2" border size="small">
        <ElDescriptionsItem :label="$t('system.operationLog.path')">
          {{ detail.path }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.operationLog.method')">
          {{ detail.method }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.operationLog.status')">
          {{ detail.status }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.operationLog.latency')">
          {{ detail.latency }} ms
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.operationLog.ip')">
          {{ detail.ip }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('system.operationLog.userId')">
          {{ detail.user_id }}
        </ElDescriptionsItem>
        <ElDescriptionsItem
          :label="$t('system.operationLog.createdAt')"
          :span="2"
        >
          {{ detail.created_at }}
        </ElDescriptionsItem>
        <ElDescriptionsItem
          v-if="detail.error_message"
          :label="$t('system.operationLog.errorMessage')"
          :span="2"
        >
          {{ detail.error_message }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <div class="mt-4 text-sm font-semibold">
        {{ $t('system.operationLog.body') }}
      </div>
      <pre
        class="bg-background-deep mt-2 max-h-60 overflow-auto rounded-md p-3 text-xs leading-5 whitespace-pre-wrap break-all"
        >{{ detail.body || '-' }}</pre>

      <div class="mt-4 text-sm font-semibold">
        {{ $t('system.operationLog.resp') }}
      </div>
      <pre
        class="bg-background-deep mt-2 max-h-60 overflow-auto rounded-md p-3 text-xs leading-5 whitespace-pre-wrap break-all"
        >{{ detail.resp || '-' }}</pre>
    </template>
  </Drawer>
</template>
