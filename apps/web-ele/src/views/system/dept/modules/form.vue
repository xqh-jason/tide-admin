<script lang="ts" setup>
/**
 * 部门新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（CreateDeptReq/UpdateDeptReq，
 * remark 无备注传空串），编辑态全量提交、空值以空字符串回传；
 * parentId 变更即移动子树并重算 path，环路/父级校验由后端兜底。
 */
import type { SystemDeptApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createDept, updateDept } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemDeptForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemDeptApi.SystemDept>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.dept.title'),
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
  null | SystemDeptApi.SystemDept | { parentId?: number }
>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 编辑态全量提交：CreateDeptReq/UpdateDeptReq 除 id 外字段相同，
            // 空值以空字符串传（不省略字段）
            updateDept({
              allowPeerRead: values.allowPeerRead ?? 0,
              deptName: values.deptName ?? '',
              id: editId.value,
              parentId: values.parentId ?? 0,
              remark: values.remark ?? '',
              sort: values.sort ?? 0,
              status: values.status,
            })
          : createDept({
              allowPeerRead: values.allowPeerRead ?? 0,
              deptName: values.deptName ?? '',
              parentId: values.parentId ?? 0,
              remark: values.remark ?? '',
              sort: values.sort ?? 0,
              status: values.status ?? 1,
            });
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
      editId.value > 0 && data ? (data as SystemDeptApi.SystemDept) : null;
    await formApi.setValues({ ...data });
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
