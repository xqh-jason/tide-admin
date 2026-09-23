<script lang="ts" setup>
import type { TagType } from './options';

/**
 * 审批进度（跨域共享）：按实例 ID 拉取 `/hr/approval/instance/get`
 * （实例 + 全部节点记录，seq 升序），供请假单 / 加班单 / 我的待办 / 审批记录
 * 四处详情复用同一份渲染，不再各写一套。
 * `instanceId` 为 0/未提供时展示「未提交审批」占位且不发请求；
 * 父层弹层若复用同一组件实例，仅需切换 `instanceId` 即自动刷新。
 */
import type { HrApprovalInstanceApi } from '#/api';

import { computed, ref, watch } from 'vue';

import {
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';

import { getApprovalInstance } from '#/api';
import { $t } from '#/locales';

import { findOption } from './find-option';
import { approvalActionOptions, approvalStatusOptions } from './options';

const props = defineProps<{ instanceId: number }>();

const detail = ref<HrApprovalInstanceApi.Detail | null>(null);
const failed = ref(false);

watch(
  () => props.instanceId,
  async (id) => {
    detail.value = null;
    failed.value = false;
    if (!id) return;
    try {
      detail.value = await getApprovalInstance(id);
    } catch {
      // 失败提示由 request 拦截器统一弹出，这里只渲染占位
      failed.value = true;
    }
  },
  { immediate: true },
);

const statusOption = computed(() =>
  findOption(approvalStatusOptions(), detail.value?.instance.status),
);
const actions = computed(() => approvalActionOptions());
/** 当前审批人：角色池节点（`currentApproverId = 0`）展示角色池占位 */
const currentApprover = computed(() => {
  const instance = detail.value?.instance;
  if (!instance) return '';
  if (instance.currentApproverName) return instance.currentApproverName;
  return instance.currentApproverRoleId
    ? `${$t('hr.common.rolePool')} #${instance.currentApproverRoleId}`
    : '-';
});
</script>

<template>
  <div v-if="!instanceId" class="py-2">
    <ElEmpty :description="$t('hr.common.notSubmitted')" :image-size="60" />
  </div>
  <div v-else-if="failed" class="py-2">
    <ElEmpty :description="$t('hr.common.loadFailed')" :image-size="60" />
  </div>
  <div v-else-if="detail" class="pt-1">
    <ElDescriptions :column="2" border size="small">
      <ElDescriptionsItem :label="$t('hr.common.approvalStatus')">
        <ElTag :type="(statusOption?.type as TagType) ?? 'info'">
          {{ statusOption?.label ?? detail.instance.status }}
        </ElTag>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('hr.common.applicant')">
        {{ detail.instance.applicantName }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('hr.common.currentApprover')">
        {{ currentApprover }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('hr.common.finishedAt')">
        {{ detail.instance.finishedAt ?? '-' }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('hr.common.submittedAt')">
        {{ detail.instance.createdAt }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('hr.common.remark')">
        {{ detail.instance.remark || '-' }}
      </ElDescriptionsItem>
    </ElDescriptions>

    <ElTimeline class="mt-5 pl-1">
      <ElTimelineItem
        v-for="record in detail.records"
        :key="record.id"
        :timestamp="record.actedAt ?? ''"
      >
        <div class="flex items-center gap-2">
          <span class="font-medium">
            {{ record.seq }}. {{ record.nodeName }}
          </span>
          <ElTag
            size="small"
            :type="
              (findOption(actions, record.action)?.type as TagType) ?? 'info'
            "
          >
            {{ findOption(actions, record.action)?.label ?? record.action }}
          </ElTag>
        </div>
        <div class="text-foreground/70 mt-1 text-xs">
          {{ $t('hr.common.approver') }}：{{ record.approverName || '-' }}
          <template v-if="record.actedByName">
            · {{ $t('hr.common.actedBy') }}：{{ record.actedByName }}
          </template>
        </div>
        <div v-if="record.opinion" class="text-foreground/70 mt-1 text-xs">
          {{ $t('hr.common.opinion') }}：{{ record.opinion }}
        </div>
      </ElTimelineItem>
    </ElTimeline>
  </div>
</template>
