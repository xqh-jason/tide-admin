<script lang="ts" setup>
/**
 * 数据字典管理列表页（字典类型维度）。
 * 列表数据走 POST /dictionary/list（分页）；新增/编辑类型在
 * modules/type-form.vue 抽屉内完成，字典项维护通过 items 入口打开
 * modules/items-panel.vue 二级抽屉（内部含字典项表格与编辑表单）。
 * 按钮权限：类型与字典项分别使用 system:dictionary:* 与
 * system:dictionary-detail:* 权限码。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemDictionaryApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteDictionary, getDictionaryList } from '#/api';
import { $t } from '#/locales';

import { auditTimeCodec, useAuditSearchSchema } from '../audit-search';
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

/**
 * 删除字典类型（软删并级联软删其下字典项，需 system:dictionary:delete），
 * popConfirm 首次确认后弹出二次风险提示，确认后才执行，成功后刷新列表
 */
async function onDelete(row: SystemDictionaryApi.Dictionary) {
  try {
    await ElMessageBox.confirm(
      $t('system.dictionary.deleteConfirm'),
      $t('system.dictionary.deleteConfirmTitle'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('common.confirm'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  await deleteDictionary(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [...useGridFormSchema(), ...useAuditSearchSchema()],
    codec: auditTimeCodec,
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

/** 打开新建字典类型抽屉（setData(null) 表示创建态） */
function onCreate() {
  typeFormDrawerApi.setData(null).open();
}

/**
 * 操作列统一入口：items 打开字典项管理弹层（无需权限码，进入后
 * 按钮级操作再按 system:dictionary-detail:* 控制），
 * edit/delete 分别受 system:dictionary:update/delete 控制
 */
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
