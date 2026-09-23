<script lang="ts" setup>
/**
 * 加班申请详情抽屉：按行 id 调 `/hr/overtime/get` 拉取全量单据字段
 * （列表行字段齐备，详情仍以接口为准），并复用共享审批进度组件
 * `<ApprovalProgress :instance-id="..." />` 展示实例状态 + 节点时间线
 * （`approvalInstanceId = 0` 时组件自身渲染「未提交审批」占位）。
 * 纯展示组件，无任何写操作。
 */
import type { HrOvertimeApi } from '#/api';
import type { TagType } from '#/views/biz/hr/shared/options';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { formatDateTime } from '@vben/utils';

import { ElDescriptions, ElDescriptionsItem, ElTag } from 'element-plus';

import { getOvertime } from '#/api';
import { $t } from '#/locales';
import ApprovalProgress from '#/views/biz/hr/shared/approval-progress.vue';
import { findOption } from '#/views/biz/hr/shared/find-option';
import { formatMinutes } from '#/views/biz/hr/shared/format';
import { approvalStatusOptions } from '#/views/biz/hr/shared/options';

import { compModeOptions, overtimeTypeOptions } from '../data';

defineOptions({ name: 'HrOvertimeDetail' });

const detail = ref<HrOvertimeApi.Overtime | null>(null);

const title = computed(() =>
  $t('ui.actionTitle.view', [$t('hr.overtime.title')]),
);
const statusOption = computed(() =>
  findOption(approvalStatusOptions(), detail.value?.status),
);
const typeOption = computed(() =>
  findOption(overtimeTypeOptions(), detail.value?.overtimeType),
);
const compOption = computed(() =>
  findOption(compModeOptions(), detail.value?.compMode),
);

const [Drawer, drawerApi] = useVbenDrawer<HrOvertimeApi.Overtime | null>({
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = drawerApi.getData();
    detail.value = null;
    if (!data) return;
    detail.value = await getOvertime(data.id);
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[720px]" :title="title">
    <template v-if="detail">
      <ElDescriptions :column="2" border size="small">
        <ElDescriptionsItem :label="$t('hr.common.applicant')">
          {{ detail.employeeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.common.approvalStatus')">
          <ElTag :type="(statusOption?.type as TagType) ?? 'info'">
            {{ statusOption?.label ?? detail.status }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.overtime.workDate')">
          {{ detail.workDate }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.overtime.duration')">
          {{ formatMinutes(detail.durationMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.overtime.startAt')">
          {{ formatDateTime(detail.startAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.overtime.endAt')">
          {{ formatDateTime(detail.endAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.overtime.overtimeType')">
          <ElTag :type="(typeOption?.type as TagType) ?? 'info'">
            {{ typeOption?.label ?? detail.overtimeType }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.overtime.compMode')">
          <ElTag :type="(compOption?.type as TagType) ?? 'info'">
            {{ compOption?.label ?? detail.compMode }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.overtime.reason')" :span="2">
          {{ detail.reason || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.common.remark')" :span="2">
          {{ detail.remark || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.common.submittedAt')">
          {{ detail.createdAt }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <!-- 转调休：审批通过后同事务生成调休批次，有效期自加班日期起 3 个自然月 -->
      <div v-if="detail.compMode === 1" class="text-foreground/70 mt-2 text-xs">
        {{ $t('hr.overtime.compTimeOffTip') }}
      </div>

      <div class="mt-4 text-sm font-semibold">
        {{ $t('hr.overtime.approvalProgress') }}
      </div>
      <ApprovalProgress class="mt-2" :instance-id="detail.approvalInstanceId" />
    </template>
  </Drawer>
</template>
