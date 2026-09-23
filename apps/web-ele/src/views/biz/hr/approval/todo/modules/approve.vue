<script lang="ts" setup>
/**
 * 待办审批抽屉：共享 <ApprovalProgress> 展示审批进度 + 审批意见 + 通过 / 驳回。
 * 契约要点（对齐后端 ApproveReq / instance/approve / instance/reject）：
 * - 通过：只推进当前节点，后续还有待审批节点时实例仍为「审批中」；
 *   驳回：实例直接置「已驳回」（不可逆），提交前二次确认；
 * - 审批意见可选，后端长度上限 255（trim 后提交）；
 * - 权限码：通过 hr:approval-instance:approve、驳回 hr:approval-instance:reject，
 *   按钮级 `v-access:code` 声明（只持有其一则另一按钮不渲染）；
 * - 两个按钮各自自持 loading 且互斥（任一请求进行中另一按钮禁用），await 完成后刷新列表。
 * 抽屉不显示默认底部按钮：提交入口即「通过 / 驳回」两个业务动作。
 */
import type { HrApprovalInstanceApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { approveApprovalInstance, rejectApprovalInstance } from '#/api';
import { $t } from '#/locales';
import ApprovalProgress from '#/views/biz/hr/shared/approval-progress.vue';

defineOptions({ name: 'HrApprovalTodoApprove' });

const emits = defineEmits(['success']);

/** 当前待办实例（由父层 setData 传入） */
const instance = ref<HrApprovalInstanceApi.ApprovalInstance | null>(null);

/** 通过 / 驳回各自的提交态：互斥禁用，防止连点重复推进同一节点 */
const approving = ref(false);
const rejecting = ref(false);

const title = computed(() =>
  $t('hr.approval.todo.approveTitle', [instance.value?.applicantName ?? '']),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: [
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        placeholder: $t('hr.approval.todo.opinionTip'),
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'opinion',
      label: $t('hr.common.opinion'),
    },
  ],
  showDefaultActions: false,
});

/** 读取审批意见（trim 后提交，空串即不填意见） */
async function readOpinion() {
  const values = await formApi.getValues();
  return ((values.opinion as string | undefined) ?? '').trim();
}

/** 审批通过（推进当前节点，需 hr:approval-instance:approve） */
async function onApprove() {
  const row = instance.value;
  if (!row || approving.value || rejecting.value) {
    return;
  }
  approving.value = true;
  try {
    await approveApprovalInstance({ id: row.id, opinion: await readOpinion() });
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    emits('success');
    drawerApi.close();
  } finally {
    approving.value = false;
  }
}

/** 审批驳回（实例直接置已驳回，不可逆，需 hr:approval-instance:reject） */
async function onReject() {
  const row = instance.value;
  if (!row || approving.value || rejecting.value) {
    return;
  }
  // 先占住提交态再弹确认：连点不会开出第二个确认框
  rejecting.value = true;
  try {
    try {
      await ElMessageBox.confirm(
        $t('hr.approval.todo.rejectConfirm', [row.applicantName]),
        $t('hr.approval.todo.reject'),
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
    await rejectApprovalInstance({ id: row.id, opinion: await readOpinion() });
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    emits('success');
    drawerApi.close();
  } finally {
    rejecting.value = false;
  }
}

const [Drawer, drawerApi] =
  useVbenDrawer<HrApprovalInstanceApi.ApprovalInstance | null>({
    async onOpenChange(isOpen) {
      if (!isOpen) return;
      instance.value = drawerApi.getData() ?? null;
      // 每次打开清空上一次的审批意见
      await formApi.reset();
    },
  });

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[760px]" :footer="false" :title="title">
    <div class="pr-[22px] pl-3">
      <ApprovalProgress :instance-id="instance?.id ?? 0" />
      <div class="mt-4">
        <Form />
      </div>
      <div class="mt-3 flex justify-end gap-2">
        <ElButton
          v-access:code="'hr:approval-instance:reject'"
          danger
          :disabled="approving"
          :loading="rejecting"
          @click="onReject"
        >
          {{ $t('hr.approval.todo.reject') }}
        </ElButton>
        <ElButton
          v-access:code="'hr:approval-instance:approve'"
          type="primary"
          :disabled="rejecting"
          :loading="approving"
          @click="onApprove"
        >
          {{ $t('hr.approval.todo.pass') }}
        </ElButton>
      </div>
    </div>
  </Drawer>
</template>
