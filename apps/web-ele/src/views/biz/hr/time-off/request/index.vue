<script lang="ts" setup>
/**
 * 请假申请页（人事管理 · **HR 管理视角，只读**）。
 *
 * 数据链路：搜索项/列定义在 data.ts（无审计搜索项与审计列：列表请求只有
 * `employeeId` / `timeOffTypeId` / `status` / `startAtBegin` / `startAtEnd` 五个过滤字段），
 * 列表数据走 POST /hr/time-off/request/list（分页），详情抽屉（modules/detail.vue）
 * 按行 id 调 /hr/time-off/request/get 并复用共享 `<ApprovalProgress>` 展示审批进度。
 *
 * **本页刻意不做写操作**（无新建 / 修改 / 提交 / 撤销 / 删除按钮）：
 * 后端 `update` / `submit` / `cancel` / `delete` 在 service 内先 `ensure_request_owner`
 * ——对比员工档案的 `userId` 与登录用户，**单据归属必须是本人**，HR 视角代他人操作
 * 必被拒（见 tide-server 的 AGENTS.md 陷阱 16）；本人的全操作入口在「我的请假」
 * （`../my-request`，走同一批端点但列表用 `/mine`）。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrTimeOffRequestApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { ElTag } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getTimeOffRequestList } from '#/api';
import { $t } from '#/locales';

import { startAtRangeCodec, useColumns, useGridFormSchema } from './data';
import Detail from './modules/detail.vue';

defineOptions({ name: 'HrTimeOffRequestList' });

// 详情抽屉：单据字段 + 审批进度（按行 approvalInstanceId 拉实例）
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

/** 操作列统一入口（CellOperation onClick 分发）：只读页仅「详情」 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrTimeOffRequestApi.TimeOffRequest>) {
  switch (code) {
    case 'detail': {
      detailDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid] = useVbenVxeGrid({
  formOptions: {
    // 请假开始时间范围拆为 startAtBegin/End 请求参数
    codec: startAtRangeCodec,
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getTimeOffRequestList({
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
  } as VxeTableGridOptions<HrTimeOffRequestApi.TimeOffRequest>,
});
</script>

<template>
  <Page auto-content-height>
    <DetailDrawer />
    <Grid :table-title="$t('hr.timeOff.request.list')">
      <template #toolbar-tools>
        <!-- 管理视角只读：写操作仅「我的请假」页可发（单据归属必须为本人） -->
        <ElTag effect="plain" type="info">
          {{ $t('hr.timeOff.request.readOnlyTip') }}
        </ElTag>
      </template>
    </Grid>
  </Page>
</template>
