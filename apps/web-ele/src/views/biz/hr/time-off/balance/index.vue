<script lang="ts" setup>
/**
 * 额度查询页（人事管理 · 假期额度域，**只读**）。
 *
 * 数据链路：搜索项/列定义在 data.ts（无审计搜索项与审计列：账户列表请求只有
 * `employeeId` / `timeOffTypeId` / `period` 三个过滤字段，响应也没有 `createdAt`），
 * 列表数据走 POST /hr/time-off/balance/list（分页），详情抽屉（modules/detail.vue）
 * 按行 id 调 /hr/time-off/balance/get 取账户各项分钟数，并按「员工 × 假别」拉
 * /hr/time-off/balance/logs 展示 append-only 流水。
 *
 * 本页无任何写操作：额度账户是授予 / 请假 / 审批各流程的**派生账本**，
 * 不存在「前端直接改额度」的端点（手工调整由额度发放 / 撤销走账，见额度发放页）。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrTimeOffBalanceApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getTimeOffBalanceList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Detail from './modules/detail.vue';

defineOptions({ name: 'HrTimeOffBalanceList' });

// 详情抽屉：打开后按行 id 拉账户详情 + 该账户流水
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

/** 操作列统一入口（CellOperation onClick 分发）：只读页仅「详情」 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrTimeOffBalanceApi.Balance>) {
  switch (code) {
    case 'detail': {
      detailDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getTimeOffBalanceList({
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
  } as VxeTableGridOptions<HrTimeOffBalanceApi.Balance>,
});
</script>

<template>
  <Page auto-content-height>
    <DetailDrawer />
    <Grid :table-title="$t('hr.timeOff.balance.list')" />
  </Page>
</template>
