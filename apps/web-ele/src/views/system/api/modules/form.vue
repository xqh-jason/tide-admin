<script lang="ts" setup>
/**
 * API 权限点新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（UpdateApiReq），编辑态全量提交、
 * 空值以空字符串兜底；roleIds 为后端必填字段（Vec 非 Option，全量替换语义）。
 * 角色授权统一在角色管理侧维护，故编辑态提交前会经 /role/list 反查当前
 * 已绑定该 API 的角色并原样回传，避免 update 的全量替换把既有授权清空。
 */
import type { SystemApiApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createApi, getRoleList, updateApi } from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemApiForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/**
 * 反查已绑定某 API 的角色 id。
 * 授权在角色管理侧维护（写入 sys_role_api），/sys-api/get 不回显 roleIds，
 * 故编辑保存前须从角色列表反查；注意只能走 /role/list（分页 handler 填充
 * 每行的 apiIds），/role/list-all 不填充 apiIds。角色规模远小于分页上限。
 */
async function fetchBoundRoleIds(apiId: number): Promise<number[]> {
  const { items } = await getRoleList({ page: 1, pageSize: 1000 });
  return items
    .filter((role) => role.apiIds?.includes(apiId))
    .map((role) => role.id);
}

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
      // 编辑态先反查已绑定该 API 的角色并回传，防止全量替换清空既有授权
      const roleIds =
        editId.value > 0 ? await fetchBoundRoleIds(editId.value) : [];
      const save =
        editId.value > 0
          ? // 后端更新为全量覆盖契约：apiGroup/description 必填非空，空值以空串兜底；
            // roleIds 为反查回传的原授权角色（保留现状），全量替换不会丢授权
            updateApi({
              apiGroup: values.apiGroup ?? '',
              description: values.description ?? '',
              id: editId.value,
              method: values.method,
              path: values.path,
              roleIds,
              status: values.status,
            } as SystemApiApi.UpdateParams)
          : // 创建同为全字段必填契约：apiGroup/description 未填以空串回传，
            // roleIds 传空数组（新接口暂不授权，后续在角色管理侧分配）
            createApi({
              apiGroup: values.apiGroup ?? '',
              description: values.description ?? '',
              method: values.method,
              path: values.path,
              roleIds,
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
