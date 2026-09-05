<script lang="ts" setup>
import type { SystemDictionaryApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createDictionaryDetail, updateDictionaryDetail } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useDetailFormSchema } from '../data';

defineOptions({ name: 'SystemDictionaryDetailForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | Partial<SystemDictionaryApi.DictionaryDetail>>(
  null,
);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.dictionary.itemTitle'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useDetailFormSchema(),
  showDefaultActions: false,
});

/**
 * 打开数据：
 * - 编辑态：父组件 setData(整行 DictionaryDetail)，id 非空；
 * - 新增态：父组件 setData({ dictionary_id })，携带所属类型 id。
 */
const [Drawer, drawerApi] =
  useVbenDrawer<null | Partial<SystemDictionaryApi.DictionaryDetail>>({
    async onConfirm() {
      const { valid } = await formApi.validate();
      if (!valid) return;
      const values = await formApi.getValues();
      const dictionaryId = drawerApi.getData()?.dictionary_id ?? 0;
      drawerApi.lock();
      try {
        const save =
          editId.value > 0
            ? updateDictionaryDetail({
                ...values,
                id: editId.value,
              } as SystemDictionaryApi.UpdateDictionaryDetailParams)
            : createDictionaryDetail({
                ...values,
                dictionary_id: dictionaryId,
              } as SystemDictionaryApi.CreateDictionaryDetailParams);
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
      // 列表项已含全部可编辑字段（label/value/extend/sort/status），直接回显
      if (data?.id) {
        formApi.setValues(data);
      }
      auditRecord.value = data?.id ? data : null;
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
