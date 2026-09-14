<script lang="ts" setup>
/**
 * 菜单管理列表页（树表）。
 * 数据链路：getMenuList 以单次请求 pageSize=1000（后端上限）拉全量，
 * 由 vxe-table treeConfig transform 按 parentId 组树并默认展开；
 * 搜索/列定义在 data.ts（append/edit/delete 权限码在列配置内声明），
 * 新增/编辑在 modules/form.vue 抽屉内完成。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemMenuApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon, Plus } from '@vben/icons';

import { ElButton, ElMessage, ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteMenu, getMenuList } from '#/api';
import { $t } from '#/locales';

import { auditTimeCodec, useAuditSearchSchema } from '../audit-search';
import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'SystemMenuList' });

// 打开数据三种形态：null（新建顶级）/ { parentId }（append 子菜单）/ 整行（编辑）
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 删除菜单（软删除，需 system:menu:delete），成功后重新拉取整棵树 */
async function onDelete(row: SystemMenuApi.SystemMenu) {
  await deleteMenu(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），append 为新增下级菜单 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemMenuApi.SystemMenu>) {
  switch (code) {
    case 'append': {
      // 携带父菜单 id 打开创建态，表单内 parentId 自动选中
      formDrawerApi.setData({ parentId: row.id }).open();
      break;
    }
    case 'delete': {
      // await 让 CellOperation 的行级操作锁覆盖整个请求，防止连点重复删除
      await onDelete(row);
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
    schema: [...useGridFormSchema(), ...useAuditSearchSchema()],
    codec: auditTimeCodec,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    // 树表：不分页，由平铺数据按 parentId 组树并默认展开
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        // getMenuList 内部已按全量分页拉取，树表不分页直接返回
        query: async (_params, formValues) => {
          return await getMenuList(formValues ?? {});
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
    treeConfig: {
      expandAll: true,
      parentField: 'parentId',
      rowField: 'id',
      transform: true,
    },
  } as VxeTableGridOptions<SystemMenuApi.SystemMenu>,
});

/** 打开新建顶级菜单抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('system.menu.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:menu:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.menu.title')]) }}
        </ElButton>
      </template>
      <template #title="{ row }">
        <div class="flex items-center gap-1">
          <IconifyIcon v-if="row.icon" :icon="row.icon" />
          <span>{{ row.title }}</span>
          <ElTag v-if="row.menuType === 3" size="small" type="warning">
            {{ $t('system.menu.permission') }}
          </ElTag>
        </div>
      </template>
    </Grid>
  </Page>
</template>
