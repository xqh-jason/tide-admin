<script lang="ts" setup>
/**
 * 角色新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（UpdateRoleReq），编辑态全量提交、
 * apiIds 前端未维护但必须回传（空数组）；menuIds/apiIds 均为"全量替换"
 * 语义（传数组即替换 sys_role_menu/sys_role_api 关联，空数组即清空）。
 * 菜单授权树勾选含半选父节点（保证后端组树完整）。
 */
import type { SystemMenuApi, SystemRoleApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage, ElTree } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  buildMenuTree as buildTree,
  createRole,
  getMenuList,
  getRole,
  updateRole,
} from '#/api';
import { $t } from '#/locales';

import AuditInfo from '../../components/audit-info.vue';
import { useFormSchema } from '../data';

defineOptions({ name: 'SystemRoleForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

/** 编辑态的行记录，供底部审计信息只读展示 */
const auditRecord = ref<null | SystemRoleApi.SystemRole>(null);

const drawerTitle = computed(() =>
  $t(editId.value > 0 ? 'ui.actionTitle.edit' : 'ui.actionTitle.create', [
    $t('system.role.title'),
  ]),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  schema: useFormSchema(),
  showDefaultActions: false,
});

// 菜单授权树状态
const treeRef = ref<InstanceType<typeof ElTree>>();
const menuTree = ref<SystemMenuApi.SystemMenu[]>([]);
/** 回显已授权节点时临时开启严格模式，避免父节点联动全选子节点 */
const treeStrictly = ref(false);

async function loadMenuTree(checkedIds: number[] = []) {
  try {
    const { items: menus } = await getMenuList();
    menuTree.value = buildTree(menus);
  } catch {
    menuTree.value = [];
  }
  treeStrictly.value = true;
  await nextTick();
  treeRef.value?.setCheckedKeys(checkedIds);
  treeStrictly.value = false;
}

/** 提交语义：勾选 + 半选（父节点）id 并集，后端全量替换 sys_role_menu */
function collectMenuIds(): number[] {
  return [
    ...(treeRef.value?.getCheckedKeys() ?? []),
    ...(treeRef.value?.getHalfCheckedKeys() ?? []),
  ].map((item) => item as number);
}

const [Drawer, drawerApi] = useVbenDrawer<null | SystemRoleApi.SystemRole>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const menuIds = collectMenuIds();
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 后端更新为全量覆盖契约：apiIds 表单未维护但也必须回传（空数组），
            // 其余字段空值以空串/0 兜底，避免缺字段被后端拒绝
            updateRole({
              apiIds: [],
              id: editId.value,
              menuIds,
              remark: values.remark ?? '',
              roleKey: values.roleKey ?? '',
              roleName: values.roleName ?? '',
              sort: values.sort ?? 0,
              status: values.status,
            } as SystemRoleApi.UpdateParams)
          : // 创建与更新同为全字段必填契约：apiIds 前端未维护也回传空数组，
            // 未填字段以空串/0 兜底（remark/sort），不省略任何参数
            createRole({
              apiIds: [],
              menuIds,
              remark: values.remark ?? '',
              roleKey: values.roleKey ?? '',
              roleName: values.roleName ?? '',
              sort: values.sort ?? 0,
              status: values.status,
            } as SystemRoleApi.CreateParams);
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
    // 编辑态拉取详情以回显已授权菜单；后端异常时静默回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getRole(data.id);
      } catch {
        base = data;
      }
    }
    await loadMenuTree(base?.menuIds ?? []);
    await nextTick();
    if (base) {
      formApi.setValues(base);
    }
    auditRecord.value = editId.value > 0 ? (base ?? null) : null;
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <Form>
        <template #menuIds>
          <div class="flex flex-col gap-2">
            <ElTree
              ref="treeRef"
              :check-strictly="treeStrictly"
              class="w-full"
              :data="menuTree"
              node-key="id"
              :props="{ label: 'title', children: 'children' }"
              show-checkbox
            />
          </div>
        </template>
      </Form>
      <AuditInfo :record="auditRecord" />
    </div>
  </Drawer>
</template>
