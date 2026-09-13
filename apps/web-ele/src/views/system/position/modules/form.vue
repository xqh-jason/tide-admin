<script lang="ts" setup>
/**
 * 职位新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（CreatePositionReq/UpdatePositionReq），
 * 编辑态全量提交、remark 空值以空字符串回传；编码全局唯一（含软删占位），
 * 撞编码由后端报业务错误。
 */
import type { SystemPositionApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createPosition, getPosition, updatePosition } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemPositionForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemPositionApi.Position>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.position.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<null | SystemPositionApi.Position>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 编辑态全量提交：所有字段（含 status）都传给后端，
            // remark 空值以空字符串传（不省略字段）
            updatePosition({
              id: editId.value,
              positionCode: values.positionCode,
              positionName: values.positionName,
              remark: values.remark ?? '',
              sort: values.sort ?? 0,
              status: values.status,
            })
          : // 创建态全量回传：未填的 remark 为空串，
            // 避免字段值为 undefined 时被 JSON 序列化省略
            createPosition({
              positionCode: values.positionCode,
              positionName: values.positionName,
              remark: values.remark ?? '',
              sort: values.sort ?? 0,
              status: values.status,
            } as SystemPositionApi.CreateParams);
      await save;
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
    // 编辑态拉取详情回显（以 /position/get 返回为准），失败时回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getPosition(data.id);
      } catch {
        base = data;
      }
    }
    if (base) {
      formApi.setValues({ ...base, remark: base.remark ?? '' });
    }
    auditRecord.value = editId.value > 0 ? (base ?? null) : null;
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <Form />
      <AuditInfo :record="auditRecord" />
    </div>
  </Drawer>
</template>
