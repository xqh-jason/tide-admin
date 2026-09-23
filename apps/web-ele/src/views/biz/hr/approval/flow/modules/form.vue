<script lang="ts" setup>
/**
 * 审批流模板新增/编辑抽屉。
 * 契约要点（对齐后端 CreateFlowReq / UpdateFlowReq）：
 * - `bizType` 取值来自字典 approvalBizType（后端按启用项校验，前端不硬编码）；
 * - `bizType` 单列唯一且唯一键含软删占位：**新增同 bizType 时后端恢复原软删行**
 *   （覆盖 name / status / remark、清空 deletedAt），不是插入第二条模板；
 * - 编辑态按 /hr/approval/flow/get 回显（详情含节点，本抽屉只消费 flow 部分），
 *   拉取失败时回退到列表行数据；
 * - 文本字段提交前 trim（后端按 trim 后校验非空与长度上限：name 64 / remark 255）。
 */
import type { HrApprovalFlowApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createApprovalFlow, getApprovalFlow, updateApprovalFlow } from '#/api';
import { $t } from '#/locales';
import AuditInfo from '#/views/system/components/audit-info.vue';

import { useFormSchema } from '../data';

defineOptions({ name: 'HrApprovalFlowForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态行记录，供底部审计信息只读展示 */
const auditRecord = ref<HrApprovalFlowApi.Flow | null>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('hr.approval.flow.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<HrApprovalFlowApi.Flow | null>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // 文本字段 trim 后提交，与后端校验口径一致
    const fields = {
      bizType: values.bizType as string,
      name: (values.name as string).trim(),
      remark: (values.remark as string | undefined) ?? '',
      status: values.status as number,
    };
    drawerApi.lock();
    try {
      await (editId.value > 0
        ? updateApprovalFlow({ ...fields, id: editId.value })
        : createApprovalFlow(fields));
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = drawerApi.getData();
    formApi.reset();
    editId.value = data?.id ?? 0;
    // 编辑态以 /hr/approval/flow/get 返回为准，失败时回退到行数据
    let base = data;
    if (data?.id) {
      try {
        const detail = await getApprovalFlow(data.id);
        base = detail.flow;
      } catch {
        // 详情失败回退行数据（base 已是行数据）
      }
    }
    if (base) {
      formApi.setValues(base);
    }
    auditRecord.value = editId.value > 0 ? (base ?? null) : null;
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pr-[22px] pl-3">
      <Form />
      <AuditInfo :record="auditRecord" />
    </div>
  </Drawer>
</template>
