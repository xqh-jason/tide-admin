<script lang="ts" setup>
/**
 * 用户新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（UpdateUserReq），编辑态全量提交、
 * 空值以空字符串回传；password 空串表示不修改密码；roleIds 传入即全量替换
 * 角色关联（空数组时后端跳过，不清空已有角色）。
 * 用户名/工号创建后禁改（disabled 由编辑态控制）。
 */
import type { SystemUserApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createUser, getUser, updateUser } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemUserForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemUserApi.SystemUser>(null);

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
          ? // 编辑态全量提交：所有字段（含禁用不可改的 username/empNo）都传给后端，
            // 空值以空字符串传（不省略字段）
            updateUser({
              email: values.email ?? '',
              empNo: values.empNo ?? '',
              id: editId.value,
              nickname: values.nickname ?? '',
              password: values.password ?? '',
              phone: values.phone ?? '',
              roleIds: values.roleIds ?? [],
              status: values.status,
              username: values.username ?? '',
            })
          : // 创建态同样全量回传：未填的可选字段（email/phone）为空串、未勾选角色为空数组，
            // 避免字段值为 undefined 时被 JSON 序列化省略、后端收不到必填字段
            createUser({
              email: values.email ?? '',
              empNo: values.empNo ?? '',
              nickname: values.nickname ?? '',
              password: values.password ?? '',
              phone: values.phone ?? '',
              roleIds: values.roleIds ?? [],
              status: values.status,
              username: values.username ?? '',
            } as SystemUserApi.CreateParams);
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
      { componentProps: { disabled: Boolean(data) }, fieldName: 'empNo' },
    ]);
    // 编辑态拉取详情回显（后端 UserResp 暂不返回 roleIds，角色选择器无法回显；
    // 提交空数组时后端跳过角色关联更新，不会清空已有角色），失败时回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getUser(data.id);
      } catch {
        base = data;
      }
    }
    if (base) {
      formApi.setValues({ ...base, roleIds: base.roleIds ?? [] });
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
