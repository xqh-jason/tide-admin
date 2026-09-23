<script lang="ts" setup>
/**
 * 请假单详情抽屉（只读）：按行 id 调 /hr/time-off/request/get 取单据全量字段，
 * 并复用共享 `<ApprovalProgress :instance-id>` 展示审批实例状态与节点时间线。
 *
 * 契约要点：
 * - `approvalInstanceId = 0` 时共享组件展示「未提交审批」占位且不发请求
 *   （本域建单即提交，正常路径下恒有实例；每轮「驳回 → 改 → 重提」都是**新**实例，
 *   故进度展示的是当前这一轮）；
 * - `durationMinutes` 由后端按「排班 × 工作日历」派生，这里只展示（formatMinutes）；
 * - 纯展示组件，无任何写操作（写操作限单据归属本人，见「我的请假」页）。
 *
 * 本文件同时被「我的请假」页复用（本人与 HR 视角读的是同一份 `TimeOffRequestResp`）。
 */
import type { HrTimeOffRequestApi } from '#/api';
import type { TagType } from '#/views/biz/hr/shared/options';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  ElDescriptions,
  ElDescriptionsItem,
  ElDivider,
  ElTag,
} from 'element-plus';

import { getTimeOffRequest } from '#/api';
import { $t } from '#/locales';
import ApprovalProgress from '#/views/biz/hr/shared/approval-progress.vue';
import { findOption } from '#/views/biz/hr/shared/find-option';
import { formatMinutes } from '#/views/biz/hr/shared/format';
import { approvalStatusOptions } from '#/views/biz/hr/shared/options';

defineOptions({ name: 'HrTimeOffRequestDetail' });

const detail = ref<HrTimeOffRequestApi.TimeOffRequest | null>(null);

const statusOption = computed(() =>
  findOption(approvalStatusOptions(), detail.value?.status),
);

/**
 * 状态标签颜色：字典选项里的 `type` 是普通 string，这里收窄为 ElTag 的合法取值
 * （选项本身由本域常量枚举构造，取值受控）
 */
const statusTagType = computed<TagType>(
  () => (statusOption.value?.type as TagType) ?? 'info',
);

const [Drawer, drawerApi] = useVbenDrawer<HrTimeOffRequestApi.TimeOffRequest>({
  async onOpenChange(isOpen) {
    if (!isOpen) {
      detail.value = null;
      return;
    }
    const data = drawerApi.getData();
    detail.value = null;
    if (!data?.id) return;
    detail.value = await getTimeOffRequest(data.id);
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[860px]" :title="$t('hr.timeOff.request.detail')">
    <template v-if="detail">
      <ElDescriptions :column="2" border size="small">
        <ElDescriptionsItem :label="$t('hr.timeOff.request.id')">
          {{ detail.id }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.employee')">
          {{ detail.employeeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.timeOffType')">
          {{ detail.timeOffTypeName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.common.approvalStatus')">
          <ElTag :type="statusTagType">
            {{ statusOption?.label ?? detail.status }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.startAt')">
          {{ detail.startAt }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.endAt')">
          {{ detail.endAt }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.durationMinutes')">
          {{ formatMinutes(detail.durationMinutes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.createdAt')">
          {{ detail.createdAt }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.reason')" :span="2">
          {{ detail.reason || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.common.remark')" :span="2">
          {{ detail.remark || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.createdByName')">
          {{ detail.createdByName || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('hr.timeOff.request.updatedByName')">
          {{ detail.updatedByName || '-' }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <ElDivider />

      <!-- 审批进度：按 approvalInstanceId 拉实例 + 节点记录（seq 升序） -->
      <ApprovalProgress :instance-id="detail.approvalInstanceId" />
    </template>
  </Drawer>
</template>
