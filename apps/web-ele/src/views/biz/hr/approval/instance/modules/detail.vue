<script lang="ts" setup>
/**
 * 审批记录详情抽屉：共享 <ApprovalProgress> 展示审批进度（实例 + 全部节点记录，seq 升序）。
 * 「撤销」是申请人本人对**审批中**单据的操作（对齐后端 instance/cancel）：
 * - 仅当 `status = 1 审批中` 且当前登录账号（sys_user.id）等于 `applicantId` 时渲染；
 * - 权限码 hr:approval-instance:cancel（按钮级 v-access）；
 * - 提交前二次确认（撤销不可逆：在途实例直接置已撤销），await + 自持 loading 防连点；
 * - 成功后刷新列表并关闭抽屉。
 * 抽屉不显示默认底部按钮：详情只读，唯一业务动作是条件性的「撤销」。
 */
import type { HrApprovalInstanceApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { cancelApprovalInstance } from '#/api';
import { $t } from '#/locales';
import ApprovalProgress from '#/views/biz/hr/shared/approval-progress.vue';

defineOptions({ name: 'HrApprovalInstanceDetail' });

const emits = defineEmits(['success']);

/** 当前查看的实例（由父层 setData 传入） */
const instance = ref<HrApprovalInstanceApi.ApprovalInstance | null>(null);

/** 撤销提交态：请求进行中置 loading 并忽略重复点击 */
const canceling = ref(false);

/** 当前登录账号 sys_user.id（与实例的 applicantId 同域，用于判定「是否本人」） */
const userStore = useUserStore();
const myUserId = computed(() => Number(userStore.userInfo?.userId ?? 0));

/** 只有审批中且申请人是本人时，才允许撤销（后端同样只放行本人 + 审批中） */
const cancellable = computed(
  () =>
    instance.value?.status === 1 &&
    instance.value.applicantId === myUserId.value,
);

const title = computed(() =>
  $t('hr.approval.instance.detailTitle', [instance.value?.applicantName ?? '']),
);

/** 撤销实例（需 hr:approval-instance:cancel），成功后刷新列表并关闭抽屉 */
async function onCancel() {
  const row = instance.value;
  if (!row || canceling.value) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('hr.approval.instance.cancelConfirm', [row.applicantName]),
      $t('hr.approval.instance.cancel'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('common.confirm'),
        type: 'warning',
      },
    );
  } catch {
    // 用户取消确认
    return;
  }
  canceling.value = true;
  try {
    await cancelApprovalInstance(row.id);
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    emits('success');
    drawerApi.close();
  } finally {
    canceling.value = false;
  }
}

const [Drawer, drawerApi] =
  useVbenDrawer<HrApprovalInstanceApi.ApprovalInstance | null>({
    onOpenChange(isOpen) {
      if (!isOpen) return;
      instance.value = drawerApi.getData() ?? null;
    },
  });

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[820px]" :footer="false" :title="title">
    <div class="pr-[22px] pl-3">
      <ApprovalProgress :instance-id="instance?.id ?? 0" />
      <div v-if="cancellable" class="mt-3 flex justify-end">
        <ElButton
          v-access:code="'hr:approval-instance:cancel'"
          danger
          :loading="canceling"
          @click="onCancel"
        >
          {{ $t('hr.approval.instance.cancel') }}
        </ElButton>
      </div>
    </div>
  </Drawer>
</template>
