<script lang="ts" setup>
import type { SystemDictionaryApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createDictionary, updateDictionary } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useTypeFormSchema } from '../data';

defineOptions({ name: 'SystemDictionaryTypeForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemDictionaryApi.Dictionary>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.dictionary.typeTitle'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useTypeFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] =
  useVbenDrawer<null | SystemDictionaryApi.Dictionary>({
    async onConfirm() {
      const { valid } = await formApi.validate();
      if (!valid) return;
      const values = await formApi.getValues();
      drawerApi.lock();
      try {
        const save =
          editId.value > 0
            ? updateDictionary({
                ...values,
                id: editId.value,
              } as SystemDictionaryApi.UpdateDictionaryParams)
            : createDictionary(
                values as SystemDictionaryApi.CreateDictionaryParams,
              );
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
      // 列表项已含全部可编辑字段（name/type/status/remark），直接回显，无需再调 get
      if (data) {
        formApi.setValues(data);
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
