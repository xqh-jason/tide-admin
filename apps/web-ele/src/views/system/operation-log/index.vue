<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { OperationLogApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteOperationLog, getOperationLogList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import DetailDrawer from './modules/detail.vue';

defineOptions({ name: 'SystemOperationLogList' });

const [Detail, detailApi] = useVbenDrawer({
  connectedComponent: DetailDrawer,
  destroyOnClose: true,
});

async function onDelete(row: OperationLogApi.OperationLog) {
  await deleteOperationLog(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getOperationLogList({
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
  } as VxeTableGridOptions<OperationLogApi.OperationLog>,
});

function onActionClick({
  code,
  row,
}: OnActionClickParams<OperationLogApi.OperationLog>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'detail': {
      detailApi.setData(row).open();
      break;
    }
  }
}
</script>

<template>
  <Page auto-content-height>
    <Detail />
    <Grid :table-title="$t('system.operationLog.list')">
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              onClick: () =>
                onActionClick({
                  code: 'detail',
                  row: row as OperationLogApi.OperationLog,
                }),
              text: $t('system.operationLog.detail'),
            },
          ]"
          :dropdown-actions="[
            {
              auth: 'system:operation-log:delete',
              danger: true,
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'delete',
                    row: row as OperationLogApi.OperationLog,
                  }),
                title: $t('ui.actionMessage.deleteConfirm', [row.id]),
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
