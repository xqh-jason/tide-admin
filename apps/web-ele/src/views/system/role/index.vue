<script lang="ts" setup>
/**
 * 角色管理列表页。
 * 数据链路：搜索/列定义在 data.ts（操作列用 CellOperation 渲染器，
 * 权限码在列配置内声明），列表数据走 POST /role/list（分页），
 * 新增/编辑（含菜单授权树）在 modules/form.vue 抽屉内完成。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteRole, getRoleList, updateRoleStatus } from '#/api';
import { $t } from '#/locales';

import { auditFieldMappingTime, useAuditSearchSchema } from '../audit-search';
import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'SystemRoleList' });

// connectedComponent 模式：FormDrawer 即 modules/form.vue（含菜单授权树）
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/**
 * 状态开关回调（CellSwitch beforeChange）：调用 /role/update-status；
 * 内置超管角色 super 后端会拒绝，返回 false 让开关回弹
 */
async function onStatusChange(
  newVal: number,
  row: SystemRoleApi.SystemRole,
): Promise<boolean> {
  try {
    await updateRoleStatus(row.id, newVal as 0 | 1);
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    return true;
  } catch {
    return false;
  }
}

/** 删除角色（软删除并清空菜单/API 关联，需 system:role:delete），成功后刷新列表 */
async function onDelete(row: SystemRoleApi.SystemRole) {
  await deleteRole(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），edit/delete 权限码见 data.ts */
function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemRoleApi.SystemRole>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'edit': {
      formDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    // 模块搜索项（keyword/status）+ 公共审计搜索项
    schema: [...useGridFormSchema(), ...useAuditSearchSchema()],
    fieldMappingTime: auditFieldMappingTime,
  },
  gridOptions: {
    columns: useColumns(onStatusChange, onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        // 分页查询：页码/页大小由 vxe proxy 注入，其余为搜索表单值
        query: async ({ page }, formValues) => {
          return getRoleList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemRoleApi.SystemRole>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('system.role.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:role:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.role.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
