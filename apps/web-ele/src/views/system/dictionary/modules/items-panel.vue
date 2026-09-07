<script lang="ts" setup>
/**
 * 字典项管理弹层：从字典类型列表点「字典项」进入，展示该类型下的字典项表格。
 * 查询固定携带 dictionaryId（当前选中类型）；新增/编辑/删除分别受
 * system:dictionary-detail:create/update/delete 权限码控制。
 * 搜索/列定义复用 ../data.ts 的 useDetailGridSearchSchema/useDetailColumns。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemDictionaryApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteDictionaryDetail, getDictionaryDetailList } from '#/api';
import { $t } from '#/locales';

import {
  auditFieldMappingTime,
  useAuditSearchSchema,
} from '../../audit-search';
import { useDetailColumns, useDetailGridSearchSchema } from '../data';
import DetailForm from './detail-form.vue';

defineOptions({ name: 'SystemDictionaryItemsPanel' });

/** 当前打开的字典类型（弹层标题与字典项查询用） */
const currentType = ref<null | SystemDictionaryApi.Dictionary>(null);

const [DetailFormDrawer, detailFormDrawerApi] = useVbenDrawer({
  connectedComponent: DetailForm,
  destroyOnClose: true,
});

async function onDelete(row: SystemDictionaryApi.DictionaryDetail) {
  await deleteDictionaryDetail(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemDictionaryApi.DictionaryDetail>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'edit': {
      detailFormDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [...useDetailGridSearchSchema(), ...useAuditSearchSchema()],
    fieldMappingTime: auditFieldMappingTime,
  },
  gridOptions: {
    columns: useDetailColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const type = currentType.value;
          if (!type) {
            return { items: [], total: 0, totalPages: 0 };
          }
          return getDictionaryDetailList({
            page: page.currentPage,
            pageSize: page.pageSize,
            dictionaryId: type.id,
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
  } as VxeTableGridOptions<SystemDictionaryApi.DictionaryDetail>,
});

function onCreate() {
  const type = currentType.value;
  if (!type) return;
  detailFormDrawerApi.setData({ dictionaryId: type.id }).open();
}

const drawerTitle = computed(() =>
  currentType.value
    ? `${$t('system.dictionary.itemTitle')} · ${currentType.value.name}`
    : $t('system.dictionary.itemTitle'),
);

const [Drawer, drawerApi] =
  useVbenDrawer<null | SystemDictionaryApi.Dictionary>({
    async onOpenChange(isOpen) {
      if (!isOpen) {
        currentType.value = null;
        return;
      }
      const data = drawerApi.getData();
      currentType.value = data ?? null;
      await nextTick();
      gridApi.reload();
    },
  });

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[1000px]" :title="drawerTitle">
    <div class="h-[560px]">
      <Grid>
        <template #toolbar-tools>
          <ElButton
            v-access:code="'system:dictionary-detail:create'"
            type="primary"
            @click="onCreate"
          >
            <Plus class="size-5" />
            {{
              $t('ui.actionTitle.create', [$t('system.dictionary.itemTitle')])
            }}
          </ElButton>
        </template>
        <template #action="{ row }">
          <VbenTableAction
            :actions="[
              {
                auth: 'system:dictionary-detail:update',
                onClick: () =>
                  onActionClick({
                    code: 'edit',
                    row: row as SystemDictionaryApi.DictionaryDetail,
                  }),
                text: $t('common.edit'),
              },
            ]"
            :dropdown-actions="[
              {
                auth: 'system:dictionary-detail:delete',
                danger: true,
                popConfirm: {
                  confirm: () =>
                    onActionClick({
                      code: 'delete',
                      row: row as SystemDictionaryApi.DictionaryDetail,
                    }),
                  title: $t('ui.actionMessage.deleteConfirm', [row.label]),
                },
                text: $t('common.delete'),
              },
            ]"
            align="center"
          />
        </template>
      </Grid>
    </div>
    <DetailFormDrawer @success="() => gridApi.query()" />
  </Drawer>
</template>
