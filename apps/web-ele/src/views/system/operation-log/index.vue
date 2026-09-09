<script lang="ts" setup>
/**
 * 操作日志列表页（只读审计页，支持查询/详情/删除）。
 * 列表数据走 POST /operation-log/list（分页，按创建时间倒序），
 * 详情抽屉（modules/detail.vue）按需调 /operation-log/get 拉取含
 * 请求体/响应体的完整记录。删除需 system:operation-log:delete 权限码。
 * 无审计搜索项/审计列：操作日志为只追加记录，无创建人/更新人语义。
 */
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

import { auditTimeCodec } from '../audit-search';
import { useColumns, useGridFormSchema } from './data';
import DetailDrawer from './modules/detail.vue';

defineOptions({ name: 'SystemOperationLogList' });

// 详情抽屉（connectedComponent 模式），打开后按行 id 拉取完整日志
const [Detail, detailApi] = useVbenDrawer({
  connectedComponent: DetailDrawer,
  destroyOnClose: true,
});

/** 删除操作日志（软删除，需 system:operation-log:delete），成功后刷新列表 */
async function onDelete(row: OperationLogApi.OperationLog) {
  await deleteOperationLog(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    // 搜索项：keyword（路径模糊）/ userId（操作人）/ status（HTTP 状态码）/
    // createdAt（时间范围，经 auditTimeCodec 拆为 createdAtBegin/End）
    codec: auditTimeCodec,
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        // 分页查询：页码/页大小由 vxe proxy 注入，其余为搜索表单值
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

/** 操作列统一入口：detail 打开详情抽屉，delete 走二次确认 */
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
