<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemDictionaryApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteDictionary, getDictionaryList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import ItemsPanel from './modules/items-panel.vue';
import TypeForm from './modules/type-form.vue';

defineOptions({ name: 'SystemDictionaryList' });

const [TypeFormDrawer, typeFormDrawerApi] = useVbenDrawer({
  connectedComponent: TypeForm,
  destroyOnClose: true,
});

/** 字典项管理弹层（接收选中的字典类型） */
const [ItemsDrawer, itemsDrawerApi] = useVbenDrawer({
  connectedComponent: ItemsPanel,
  destroyOnClose: true,
});

async function onDelete(row: SystemDictionaryApi.Dictionary) {
  await deleteDictionary(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getDictionaryList({
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
  } as VxeTableGridOptions<SystemDictionaryApi.Dictionary>,
});

function onCreate() {
  typeFormDrawerApi.setData(null).open();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemDictionaryApi.Dictionary>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'edit': {
      typeFormDrawerApi.setData(row).open();
      break;
    }
    case 'items': {
      itemsDrawerApi.setData(row).open();
      break;
    }
  }
}
</script>

<template>
  <Page auto-content-height>
    <TypeFormDrawer @success="() => gridApi.query()" />
    <ItemsDrawer />
    <Grid :table-title="$t('system.dictionary.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:dictionary:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.dictionary.typeTitle')]) }}
        </ElButton>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              onClick: () =>
                onActionClick({
                  code: 'items',
                  row: row as SystemDictionaryApi.Dictionary,
                }),
              text: $t('system.dictionary.itemTitle'),
            },
            {
              auth: 'system:dictionary:update',
              onClick: () =>
                onActionClick({
                  code: 'edit',
                  row: row as SystemDictionaryApi.Dictionary,
                }),
              text: $t('common.edit'),
            },
          ]"
          :dropdown-actions="[
            {
              auth: 'system:dictionary:delete',
              danger: true,
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'delete',
                    row: row as SystemDictionaryApi.Dictionary,
                  }),
                title: $t('ui.actionMessage.deleteConfirm', [row.name]),
              },
              text: $t('common.delete'),
            },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
