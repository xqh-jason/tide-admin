<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { LoginLogApi } from '#/api';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteLoginLog, getLoginLogList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';

defineOptions({ name: 'SystemLoginLogList' });

async function onDelete(row: LoginLogApi.LoginLog) {
  await deleteLoginLog(row.id);
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
          return getLoginLogList({
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
  } as VxeTableGridOptions<LoginLogApi.LoginLog>,
});

function onActionClick({
  code,
  row,
}: OnActionClickParams<LoginLogApi.LoginLog>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
  }
}
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('system.loginLog.list')">
      <template #action="{ row }">
        <VbenTableAction
          :dropdown-actions="[
            {
              auth: 'system:login-log:delete',
              danger: true,
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'delete',
                    row: row as LoginLogApi.LoginLog,
                  }),
                title: $t('ui.actionMessage.deleteConfirm', [row.username]),
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
