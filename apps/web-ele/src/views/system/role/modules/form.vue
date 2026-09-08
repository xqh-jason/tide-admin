<script lang="ts" setup>
/**
 * 角色新增/编辑抽屉。
 * 契约要点：后端创建/更新均为全字段必填（UpdateRoleReq），编辑态全量提交、
 * menuIds/apiIds 均为"全量替换"语义（传数组即替换 sys_role_menu/sys_role_api
 * 关联，空数组即清空）。菜单授权树勾选含半选父节点（保证后端组树完整）；
 * API 权限点按 apiGroup 分组勾选，提交勾选 id 全量列表。
 */
import type { SystemApiApi, SystemMenuApi, SystemRoleApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElCollapse,
  ElCollapseItem,
  ElMessage,
  ElTag,
  ElTree,
} from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  buildMenuTree as buildTree,
  createRole,
  getApiList,
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

// API 权限点勾选状态
const apiList = ref<SystemApiApi.SystemApi[]>([]);
const checkedApiIds = ref<number[]>([]);
/** 当前展开的分组（默认全部展开） */
const expandedGroups = ref<string[]>([]);

/** 按 apiGroup 分组（空分组归入「未分组」），组内按 path 排序 */
const apiGroups = computed(() => {
  const map = new Map<string, SystemApiApi.SystemApi[]>();
  for (const api of apiList.value) {
    const group = api.apiGroup || $t('system.role.apisUngrouped');
    const list = map.get(group) ?? [];
    list.push(api);
    map.set(group, list);
  }
  return [...map.entries()].map(([group, items]) => ({
    group,
    items: items.toSorted((a, b) => a.path.localeCompare(b.path)),
  }));
});

async function loadApis(checkedIds: number[] = []) {
  try {
    const { items } = await getApiList({ page: 1, pageSize: 1000 });
    apiList.value = items;
  } catch {
    apiList.value = [];
  }
  checkedApiIds.value = checkedIds;
  // 分组名逻辑需与 apiGroups 计算属性保持一致（空分组归入「未分组」）
  expandedGroups.value = [
    ...new Set(
      apiList.value.map(
        (api) => api.apiGroup || $t('system.role.apisUngrouped'),
      ),
    ),
  ];
}

/** 分组内权限点是否已全部勾选 */
function isGroupAllChecked(items: SystemApiApi.SystemApi[]): boolean {
  return items.every((api) => checkedApiIds.value.includes(api.id));
}

/** 一键勾选/取消当前分组的全部权限点 */
function toggleGroup(items: SystemApiApi.SystemApi[]) {
  const ids = items.map((api) => api.id);
  checkedApiIds.value = isGroupAllChecked(items)
    ? checkedApiIds.value.filter((id) => !ids.includes(id))
    : [...new Set([...checkedApiIds.value, ...ids])];
}

const [Drawer, drawerApi] = useVbenDrawer<null | SystemRoleApi.SystemRole>({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    const menuIds = collectMenuIds();
    // 全量替换语义：提交当前勾选 id（空数组即清空授权）
    const apiIds = [...checkedApiIds.value];
    drawerApi.lock();
    try {
      const save =
        editId.value > 0
          ? // 后端更新为全量覆盖契约：apiIds 提交当前勾选（空数组即清空），
            // 其余字段空值以空串/0 兜底，避免缺字段被后端拒绝
            updateRole({
              apiIds,
              id: editId.value,
              menuIds,
              remark: values.remark ?? '',
              roleKey: values.roleKey ?? '',
              roleName: values.roleName ?? '',
              sort: values.sort ?? 0,
              status: values.status,
            } as SystemRoleApi.UpdateParams)
          : // 创建与更新同为全字段必填契约：apiIds 提交当前勾选（空数组即无授权），
            // 未填字段以空串/0 兜底（remark/sort），不省略任何参数
            createRole({
              apiIds,
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
    await loadApis(base?.apiIds ?? []);
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
  <Drawer class="w-[640px]" :title="drawerTitle">
    <div class="pl-3 pr-[22px]">
      <Form />
      <!-- 菜单/API 权限区块：独立于表单字段渲染，铺满抽屉内容区宽度 -->
      <div class="mt-2 flex flex-col gap-5">
        <section>
          <div class="mb-2 text-sm font-medium">
            {{ $t('system.role.menus') }}
          </div>
          <div
            class="border-input max-h-[340px] overflow-y-auto rounded-md border p-3 [&_.el-tree-node__content]:h-8 [&_.el-tree-node__content]:text-[15px]"
          >
            <ElTree
              ref="treeRef"
              :check-strictly="treeStrictly"
              :data="menuTree"
              node-key="id"
              :props="{ label: 'title', children: 'children' }"
              show-checkbox
            />
          </div>
        </section>
        <section>
          <div class="mb-2 text-sm font-medium">
            {{ $t('system.role.apis') }}
          </div>
          <div
            class="border-input max-h-[340px] overflow-y-auto rounded-md border p-3 [&_.el-collapse]:border-none [&_.el-collapse-item__header]:h-10"
          >
            <ElCollapse v-model="expandedGroups">
              <ElCollapseItem
                v-for="{ group, items } in apiGroups"
                :key="group"
                :name="group"
              >
                <template #title>
                  <div class="flex flex-1 items-center justify-between pr-2">
                    <span class="text-sm font-medium">
                      {{ group }}（{{ items.length }}）
                    </span>
                    <ElButton
                      link
                      size="small"
                      type="primary"
                      @click.stop="toggleGroup(items)"
                    >
                      {{
                        isGroupAllChecked(items)
                          ? $t('system.role.apisClear')
                          : $t('system.role.apisSelectAll')
                      }}
                    </ElButton>
                  </div>
                </template>
                <ElCheckboxGroup v-model="checkedApiIds" class="w-full">
                  <div class="flex flex-col gap-3 py-1">
                    <ElCheckbox
                      v-for="api in items"
                      :key="api.id"
                      class="mr-0 h-auto"
                      :value="api.id"
                    >
                      <div
                        class="flex flex-wrap items-center gap-x-1.5 gap-y-1"
                      >
                        <ElTag size="small">{{ api.method }}</ElTag>
                        <span class="break-all text-sm">{{ api.path }}</span>
                        <span
                          v-if="api.description"
                          class="text-muted-foreground text-xs"
                        >
                          {{ api.description }}
                        </span>
                      </div>
                    </ElCheckbox>
                  </div>
                </ElCheckboxGroup>
              </ElCollapseItem>
            </ElCollapse>
          </div>
        </section>
      </div>
      <AuditInfo :record="auditRecord" />
    </div>
  </Drawer>
</template>
