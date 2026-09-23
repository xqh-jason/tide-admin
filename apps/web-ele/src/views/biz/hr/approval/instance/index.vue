<script lang="ts" setup>
/**
 * 审批记录列表页（管理视角 · 业务域 biz/hr/approval）。
 * 数据链路：搜索/列定义在 data.ts（操作列用 CellOperation 渲染器），列表数据走
 * POST /hr/approval/instance/list（分页，按业务类型 / 状态 / 申请人过滤）。
 * 行内「详情」打开 modules/detail.vue 抽屉（共享 <ApprovalProgress> 展示进度，
 * 抽屉内按「审批中 + 申请人本人」条件提供撤销入口，权限码 hr:approval-instance:cancel）。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrApprovalInstanceApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getApprovalInstanceList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Detail from './modules/detail.vue';

defineOptions({ name: 'HrApprovalInstanceList' });

// 详情抽屉：按行传入实例，抽屉内展示审批进度（撤销入口按状态与申请人判定）
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

/** 操作列统一入口（CellOperation onClick 分发） */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrApprovalInstanceApi.ApprovalInstance>) {
  switch (code) {
    case 'detail': {
      detailDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    // 搜索项：bizType / status / applicantId，与后端 InstanceListReq 一一对应
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getApprovalInstanceList({
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
    <DetailDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.approval.instance.list')" />
  </Page>
</template>
