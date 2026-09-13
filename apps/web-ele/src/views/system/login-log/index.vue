<script lang="ts" setup>
/**
 * 登录日志列表页（只读审计页，仅支持查询与删除）。
 * 列表数据走 POST /login-log/list（分页，按创建时间倒序）；
 * 搜索/列定义在 data.ts，删除需 system:login-log:delete 权限码。
 * 无审计搜索项/审计列：登录日志为只追加记录，无创建人/更新人语义。
 */
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

/** 删除登录日志（软删除，需 system:login-log:delete），成功后刷新列表 */
async function onDelete(row: LoginLogApi.LoginLog) {
  await deleteLoginLog(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    // 搜索项：username/ip/status，与后端 LoginLogListReq 一一对应
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
          :actions="[
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
