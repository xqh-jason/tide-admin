<script lang="ts" setup>
/**
 * 我的待办页（审批人工作台 · 业务域 biz/hr/approval）。
 * 数据链路：搜索/列定义在 data.ts（操作列用 CellOperation 渲染器，权限码在列配置内声明），
 * 列表数据走 POST /hr/approval/instance/todo（后端按当前登录人过滤：当前节点轮到我，
 * 或我持有该节点角色池的角色），只支持 bizType 过滤。
 * 行内「审批」打开 modules/approve.vue 抽屉（共享 <ApprovalProgress> + 通过 / 驳回）。
 * 按钮权限：通过 hr:approval-instance:approve、驳回 hr:approval-instance:reject。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrApprovalInstanceApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getApprovalTodoList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Approve from './modules/approve.vue';

defineOptions({ name: 'HrApprovalTodoList' });

// 审批抽屉：按行传入实例，抽屉内展示审批进度并提交通过 / 驳回
const [ApproveDrawer, approveDrawerApi] = useVbenDrawer({
  connectedComponent: Approve,
  destroyOnClose: true,
});

/** 操作列统一入口（CellOperation onClick 分发），approve 权限码见 data.ts */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrApprovalInstanceApi.ApprovalInstance>) {
  switch (code) {
    case 'approve': {
      approveDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    // 搜索项：bizType（业务类型），与后端 TodoListReq 一一对应
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getApprovalTodoList({
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
  } as VxeTableGridOptions<HrApprovalInstanceApi.ApprovalInstance>,
});
</script>

<template>
  <Page auto-content-height>
    <ApproveDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.approval.todo.list')" />
  </Page>
</template>
