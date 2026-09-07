<script lang="ts" setup>
/**
 * 菜单新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（CreateMenuReq/UpdateMenuReq），
 * 按钮类型（menuType=3）下 path/name/component 等字段被隐藏拿不到值，
 * 创建与更新统一做空值兜底回传。表单字段显隐/校验按 menuType 联动
 * （见 data.ts useFormSchema）。
 */
import type { SystemMenuApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createMenu, updateMenu } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemMenuForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemMenuApi.SystemMenu>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.menu.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer<
  null | SystemMenuApi.SystemMenu | { parentId?: number }
>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 后端更新为全量覆盖契约：13 个字段全部必填非空；按钮类型下
            // path/name/component 等字段被隐藏不渲染，需以空值兜底回传
            updateMenu({
              component: values.component ?? '',
              hidden: values.hidden ?? 0,
              icon: values.icon ?? '',
              id: editId.value,
              keepAlive: values.keepAlive ?? 0,
              menuType: values.menuType,
              name: values.name ?? '',
              parentId: values.parentId ?? 0,
              path: values.path ?? '',
              permission: values.permission ?? '',
              sort: values.sort ?? 0,
              status: values.status,
              title: values.title ?? '',
            } as SystemMenuApi.UpdateParams)
          : // 创建契约中 path/name 同为必填字段：按钮类型（menuType=3）下
            // 两个字段被隐藏拿不到值，统一以空值兜底，避免后端反序列化失败
            createMenu({
              component: values.component ?? '',
              hidden: values.hidden ?? 0,
              icon: values.icon ?? '',
              keepAlive: values.keepAlive ?? 0,
              menuType: values.menuType,
              name: values.name ?? '',
              parentId: values.parentId ?? 0,
              path: values.path ?? '',
              permission: values.permission ?? '',
              sort: values.sort ?? 0,
              status: values.status ?? 1,
              title: values.title ?? '',
            } as SystemMenuApi.CreateParams);
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
    editId.value = data && 'id' in data && data.id ? data.id : 0;
    auditRecord.value =
      editId.value > 0 && data ? (data as SystemMenuApi.SystemMenu) : null;
    await formApi.setValues({ ...data });
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
