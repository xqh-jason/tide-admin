<script lang="ts" setup>
/**
 * 用户新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（UpdateUserReq），编辑态全量提交、
 * 空值以空字符串回传；password 空串表示不修改密码；roleIds/depts/positionIds
 * 均为全量替换语义（后端先清空旧关联再插入，空数组即清空全部关联）。
 * depts 非空时后端要求恰好一个主部门（isPrimary=1）。
 */
import type { SystemUserApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createUser, getUser, updateUser } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { refreshDeptTreeCache, useFormSchema } from '../data';

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
    const deptIds = (values.deptIds as number[] | undefined) ?? [];
    const leaderDeptIds = (values.leaderDeptIds as number[] | undefined) ?? [];
    // 负责人仅保留已选部门（从树中取消勾选后可能残留旧选项）；
    // 恰好一个主部门由表单校验规则保证，提交前无需重复
    const depts: SystemUserApi.UserDeptItem[] = deptIds.map((deptId) => ({
      deptId,
      isLeader: leaderDeptIds.includes(deptId) ? 1 : 0,
      isPrimary: deptId === values.primaryDeptId ? 1 : 0,
    }));
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 编辑态全量提交：所有字段（含禁用不可改的 username/empNo）都传给后端，
            // 空值以空字符串传（不省略字段）
            updateUser({
              depts,
              email: values.email ?? '',
              empNo: values.empNo ?? '',
              id: editId.value,
              nickname: values.nickname ?? '',
              password: values.password ?? '',
              phone: values.phone ?? '',
              positionIds: values.positionIds ?? [],
              roleIds: values.roleIds ?? [],
              status: values.status,
              username: values.username ?? '',
            })
          : // 创建态同样全量回传：未填的可选字段（email/phone）为空串、未勾选角色为空数组，
            // 避免字段值为 undefined 时被 JSON 序列化省略、后端收不到必填字段
            createUser({
              depts,
              email: values.email ?? '',
              empNo: values.empNo ?? '',
              nickname: values.nickname ?? '',
              password: values.password ?? '',
              phone: values.phone ?? '',
              positionIds: values.positionIds ?? [],
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
    // 编辑态经 /user/get 拉详情回显（列表 UserResp 不含 roleIds，详情接口填充），
    // 拉取失败回退到行数据。部门树与详情并行拉取：树先于回填就绪，
    // 避免部门多选框先渲染出裸 id、主部门/负责人选项为空
    let base = data;
    const tasks: Promise<void>[] = [
      refreshDeptTreeCache().catch(() => undefined),
    ];
    if (data?.id) {
      tasks.push(
        getUser(data.id)
          .then((detail) => {
            base = detail;
          })
          .catch(() => {
            base = data;
          }),
      );
    }
    await Promise.all(tasks);
    if (base) {
      // depts 反解为表单三字段：deptIds 多选、主部门单选、负责部门多选
      const depts = base.depts ?? [];
      formApi.setValues({
        ...base,
        deptIds: depts.map((dept) => dept.deptId),
        leaderDeptIds: depts
          .filter((dept) => dept.isLeader === 1)
          .map((dept) => dept.deptId),
        primaryDeptId: depts.find((dept) => dept.isPrimary === 1)?.deptId,
        positionIds: (base.positions ?? []).map(
          (position) => position.positionId,
        ),
        roleIds: base.roleIds ?? [],
      });
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
