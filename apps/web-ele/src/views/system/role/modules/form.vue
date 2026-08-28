<script lang="ts" setup>
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

import { useFormSchema } from '../data';

defineOptions({ name: 'SystemRoleForm' });

const emits = defineEmits(['success']);

const editId = ref(0);

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
    const menus = await getMenuList();
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
    const menu_ids = collectMenuIds();
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? updateRole({
              ...values,
              id: editId.value,
              menu_ids,
            } as SystemRoleApi.UpdateParams)
          : createRole({ ...values, menu_ids } as SystemRoleApi.CreateParams);
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
    // 编辑态拉取详情以回显已授权菜单；后端未就绪时静默回退到行数据
    let base = data;
    if (data?.id) {
      try {
        base = await getRole(data.id);
      } catch {
        base = data;
      }
    }
    await loadMenuTree(base?.menu_ids ?? []);
    await nextTick();
    if (base) {
      formApi.setValues(base);
    }
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[560px]" :title="drawerTitle">
    <Form>
      <template #menu_ids>
        <ElTree
          ref="treeRef"
          :check-strictly="treeStrictly"
          class="w-full"
          :data="menuTree"
          node-key="id"
          :props="{ label: 'title', children: 'children' }"
          show-checkbox
        />
      </template>
    </Form>
  </Drawer>
</template>
