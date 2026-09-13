<script lang="ts" setup>
/**
 * 字典项新增/编辑抽屉（嵌套在 items-panel 弹层内）。
 * 契约要点：后端创建/更新为全量覆盖（UpdateDictionaryDetailReq），
 * dictionaryId 必须回传避免所属字典被清空；编辑态直接用行数据回显。
 */
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
 * - 新增态：父组件 setData({ dictionaryId })，携带所属类型 id。
 */
const [Drawer, drawerApi] =
  useVbenDrawer<null | Partial<SystemDictionaryApi.DictionaryDetail>>({
    async onConfirm() {
      const { valid } = await formApi.validate();
      if (!valid) return;
      const values = await formApi.getValues();
      const dictionaryId = drawerApi.getData()?.dictionaryId ?? 0;
      drawerApi.lock();
      try {
        const save =
          editId.value > 0
            ? // 全量覆盖契约：dictionaryId 也必须回传，避免所属字典被清空
              updateDictionaryDetail({
                ...values,
                dictionaryId,
                // extend 后端必填（serde missing field 即拒），未填以空串兜底
                extend: values.extend ?? '',
                id: editId.value,
              } as SystemDictionaryApi.UpdateDictionaryDetailParams)
            : createDictionaryDetail({
                ...values,
                dictionaryId,
                // 创建契约 extend 同为必填 String，未填以空串兜底
                extend: values.extend ?? '',
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
