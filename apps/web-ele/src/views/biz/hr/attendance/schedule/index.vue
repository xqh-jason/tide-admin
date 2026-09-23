<script lang="ts" setup>
/**
 * 排班管理列表页（人事管理 · 业务域 biz/hr/attendance/schedule）。
 * 后端契约（`modules/biz/hr/attendance/dto.rs`）：
 * - 列表走 POST /hr/attendance/schedule/list（`ScheduleListReq`：员工 / 班次 /
 *   状态 / 排班日区间过滤，分页 `page`/`pageSize`）；
 * - 排班表**不软删**：批量排班与单日调整都是「按 `(employeeId, workDate)` upsert」，
 *   命中已有行即覆盖，所以没有删除操作；
 * - `shiftId = 0` 表示当天休息；状态值域 1 正常 / 2 已换班。
 * 按钮权限：批量排班 hr:attendance-schedule:batch-create、
 * 单日调整 hr:attendance-schedule:update（行内操作权限码在 data.ts 声明）。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrAttendanceScheduleApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAttendanceScheduleList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Batch from './modules/batch.vue';
import Form from './modules/form.vue';
import Month from './modules/month.vue';

defineOptions({ name: 'HrAttendanceScheduleList' });

const [BatchDrawer, batchDrawerApi] = useVbenDrawer({
  connectedComponent: Batch,
  destroyOnClose: true,
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [MonthDrawer, monthDrawerApi] = useVbenDrawer({
  connectedComponent: Month,
  destroyOnClose: true,
});

/**
 * 操作列统一入口（CellOperation onClick 分发，权限码见 data.ts）：
 * 「调整」打开单日 upsert 抽屉（按 employeeId + workDate 定位）
 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrAttendanceScheduleApi.Schedule>) {
  switch (code) {
    case 'update': {
      formDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
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
          return getAttendanceScheduleList({
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
  } as VxeTableGridOptions<HrAttendanceScheduleApi.Schedule>,
});

/** 打开批量排班抽屉（员工多选 × 日期区间，逐日 upsert） */
function onBatchCreate() {
  batchDrawerApi.open();
}

/** 打开月视图抽屉（某月全员排班网格，未排班日显示占位） */
function onMonthView() {
  monthDrawerApi.open();
}
</script>

<template>
  <Page auto-content-height>
    <BatchDrawer @success="() => gridApi.query()" />
    <FormDrawer @success="() => gridApi.query()" />
    <MonthDrawer />
    <Grid :table-title="$t('hr.attendance.schedule.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:attendance-schedule:batch-create'"
          type="primary"
          @click="onBatchCreate"
        >
          <Plus class="size-5" />
          {{ $t('hr.attendance.schedule.batchCreate') }}
        </ElButton>
        <ElButton @click="onMonthView">
          {{ $t('hr.attendance.schedule.monthView') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
