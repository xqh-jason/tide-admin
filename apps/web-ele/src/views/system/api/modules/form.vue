<script lang="ts" setup>
import type { SystemApiApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createApi, updateApi } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemApiForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemApiApi.SystemApi>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.api.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<null | SystemApiApi.SystemApi>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // roleIds 全量替换语义；未选择时传空数组（后端会清空授权）
    const roleIds: number[] = values.roleIds ?? [];
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 后端更新为全量覆盖契约：apiGroup/description 必填非空，空值以空串兜底
            updateApi({
              apiGroup: values.apiGroup ?? '',
              description: values.description ?? '',
              id: editId.value,
              method: values.method,
              path: values.path,
              roleIds,
              status: values.status,
            } as SystemApiApi.UpdateParams)
          : createApi({ ...values, roleIds } as SystemApiApi.CreateParams);
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
    if (data) {
      // 后端 /sys-api/get 不回传 roleIds，编辑时授权角色需重新选择
      const { roleIds, ...rest } = data as SystemApiApi.SystemApi & {
        roleIds?: number[];
      };
      formApi.setValues(rest);
    }
    auditRecord.value = editId.value > 0 ? (data ?? null) : null;
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <Form />
    <AuditInfo :record="auditRecord" />
  </Drawer>
</template>
