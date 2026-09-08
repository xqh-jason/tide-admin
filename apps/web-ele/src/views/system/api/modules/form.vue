<script lang="ts" setup>
/**
 * API 权限点新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（UpdateApiReq），编辑态全量提交、
 * 空值以空字符串兜底；roleIds 为后端必填字段（Vec 非 Option，全量替换语义），
 * 但角色授权统一在角色管理侧维护，表单固定回传空数组（即清空/不授权）。
 */
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
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 后端更新为全量覆盖契约：apiGroup/description 必填非空，空值以空串兜底；
            // roleIds 后端必填但角色授权在角色管理侧维护，固定传空数组（即清空）
            updateApi({
              apiGroup: values.apiGroup ?? '',
              description: values.description ?? '',
              id: editId.value,
              method: values.method,
              path: values.path,
              roleIds: [],
              status: values.status,
            } as SystemApiApi.UpdateParams)
          : // 创建同为全字段必填契约：apiGroup/description 未填以空串回传，
            // roleIds 固定传空数组（即暂不授权），不省略任何参数
            createApi({
              apiGroup: values.apiGroup ?? '',
              description: values.description ?? '',
              method: values.method,
              path: values.path,
              roleIds: [],
              status: values.status,
            } as SystemApiApi.CreateParams);
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
      formApi.setValues(data);
    }
    auditRecord.value = editId.value > 0 ? (data ?? null) : null;
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
