<script lang="ts" setup>
/**
 * 会话管理列表页（在线会话/登录凭证审计，仅支持查询、强制下线与删除）。
 * 列表数据走 POST /refresh-token/list（分页，按登录时间倒序）；
 * 搜索/列定义在 data.ts，status 为前端派生的展示字段（query 内映射）。
 * 按钮权限：强制下线 system:session:force-logout、
 * 删除 system:session:delete（单条与批量共用，对齐 job-log 先例）。
 * 无新增/编辑表单：会话由登录行为产生，管理端只做下线与清理。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemSessionApi } from '#/api';

import { Page } from '@vben/common-ui';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import {
  deleteSession,
  deleteSessionBatch,
  forceLogoutSession,
  getSessionList,
} from '#/api';
import { $t } from '#/locales';

import {
  deriveSessionStatus,
  isSessionDead,
  useColumns,
  useGridFormSchema,
} from './data';

defineOptions({ name: 'SystemSessionList' });

/** 强制下线（吊销会话并盖章操作人，需 system:session:force-logout），成功后刷新列表 */
async function onForceLogout(row: SystemSessionApi.Session) {
  await forceLogoutSession(row.id);
  ElMessage.success($t('ui.actionMessage.operationSuccess'));
  gridApi.query();
}

/** 删除死记录（物理删除，需 system:session:delete），成功后刷新列表 */
async function onDelete(row: SystemSessionApi.Session) {
  await deleteSession(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 批量删除勾选的会话记录：在线/未过期会话由后端静默跳过 */
async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as SystemSessionApi.Session[];
  if (rows.length === 0) {
    ElMessage.warning($t('system.session.batchDeleteEmpty'));
    return;
  }
  await ElMessageBox.confirm(
    $t('system.session.batchDeleteConfirm', [rows.length]),
    $t('common.delete'),
    { type: 'warning' },
  );
  await deleteSessionBatch(rows.map((row) => row.id));
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.grid.clearCheckboxRow();
  gridApi.query();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemSessionApi.Session>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'forceLogout': {
      onForceLogout(row);
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    // 搜索项：username/onlineOnly，与后端 RefreshTokenListReq 一一对应
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getSessionList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
          // status 为前端派生的展示字段（下线/过期/在线/离线），非后端返回字段
          return {
            ...result,
            items: result.items.map((item) => ({
              ...item,
              status: deriveSessionStatus(item),
            })),
          };
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
  } as VxeTableGridOptions<SystemSessionApi.Session>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('system.session.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:session:delete'"
          danger
          plain
          @click="onBatchDelete"
        >
          {{ $t('system.session.batchDelete') }}
        </ElButton>
      </template>
      <!-- 操作列：VbenTableAction 内置权限过滤（auth 字段），ifShow 做行级互斥显隐——
           活跃会话只显示强制下线，死记录（已下线/已过期）只显示删除；
           两者均走气泡二次确认 -->
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              auth: 'system:session:force-logout',
              ifShow: !isSessionDead(row as SystemSessionApi.Session),
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'forceLogout',
                    row: row as SystemSessionApi.Session,
                  }),
                title: $t('system.session.forceLogoutConfirm', [
                  (row as SystemSessionApi.Session).username,
                ]),
              },
              text: $t('system.session.forceLogout'),
            },
            {
              auth: 'system:session:delete',
              danger: true,
              ifShow: isSessionDead(row as SystemSessionApi.Session),
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'delete',
                    row: row as SystemSessionApi.Session,
                  }),
                title: $t('ui.actionMessage.deleteConfirm', [
                  (row as SystemSessionApi.Session).username,
                ]),
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
