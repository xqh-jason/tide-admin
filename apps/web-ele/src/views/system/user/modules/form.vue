<script lang="ts" setup>
import type { SystemUserApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createUser, getUser, updateUser } from '#/api';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

defineOptions({ name: 'SystemUserForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.user.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(() => editId.value),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<null | SystemUserApi.SystemUser>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 编辑态全量提交：所有字段都传给后端，空值以空字符串传（不省略字段）
            updateUser({
              email: values.email ?? '',
              emp_no: values.emp_no ?? '',
              id: editId.value,
              nickname: values.nickname ?? '',
              password: values.password ?? '',
              phone: values.phone ?? '',
              role_ids: values.role_ids ?? [],
              status: values.status,
            })
          : createUser(values as SystemUserApi.CreateParams);
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
    // 用户名和工号创建后不可修改
    formApi.updateSchema([
      { componentProps: { disabled: Boolean(data) }, fieldName: 'username' },
      { componentProps: { disabled: Boolean(data) }, fieldName: 'emp_no' },
    ]);
    // 编辑态拉取详情以回显角色；后端未就绪时静默回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getUser(data.id);
      } catch {
        base = data;
      }
    }
    if (base) {
      formApi.setValues({ ...base, role_ids: base.role_ids ?? [] });
    }
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <Form />
  </Drawer>
</template>
