<script lang="ts" setup>
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

import { auditFieldMappingTime, useAuditSearchSchema } from '../audit-search';
import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'SystemMenuList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

async function onDelete(row: SystemMenuApi.SystemMenu) {
  await deleteMenu(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemMenuApi.SystemMenu>) {
  switch (code) {
    case 'append': {
      formDrawerApi.setData({ parentId: row.id }).open();
      break;
    }
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
    schema: [...useGridFormSchema(), ...useAuditSearchSchema()],
    fieldMappingTime: auditFieldMappingTime,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    // 树表：不分页，由平铺数据按 parentId 组树并默认展开
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_params, formValues) => {
          // getMenuList 内部已按全量分页拉取，树表不分页直接返回
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
