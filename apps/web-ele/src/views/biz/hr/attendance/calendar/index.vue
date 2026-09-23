<script lang="ts" setup>
/**
 * 工作日历列表页（考勤域 · biz/hr/attendance）。
 * 数据链路：搜索/列定义在 data.ts（日期范围经 codec 拆为 dateBegin/dateEnd），
 * 列表数据走 POST /hr/attendance/calendar/list（分页；日期区间 / 工作日 / 类型过滤）。
 * 写操作只有两个入口，均为 **upsert**（日历不软删、无删除端点）：
 * - 「维护日历」抽屉（modules/form.vue）单日 upsert → 权限码 hr:attendance-calendar:upsert；
 * - 「批量导入」抽屉（modules/import.vue）按日期区间逐日 upsert → 权限码 hr:attendance-calendar:batch-import。
 * 行内「修改」复用同一 upsert 抽屉（calendarDate 是唯一键，端点幂等）。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrAttendanceCalendarApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAttendanceCalendarList } from '#/api';
import { $t } from '#/locales';

import { calendarDateRangeCodec, useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Import from './modules/import.vue';

defineOptions({ name: 'HrAttendanceCalendarList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [ImportDrawer, importDrawerApi] = useVbenDrawer({
  connectedComponent: Import,
  destroyOnClose: true,
});

/** 操作列统一入口（CellOperation onClick 分发），权限码见 data.ts */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrAttendanceCalendarApi.Calendar>) {
  switch (code) {
    case 'edit': {
      // 单日 upsert：唯一键 calendarDate，抽屉内可改回该日期的任意取值
      formDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    // daterange 值拆为后端 CalendarListReq 的 dateBegin / dateEnd
    codec: calendarDateRangeCodec,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getAttendanceCalendarList({
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
  } as VxeTableGridOptions<HrAttendanceCalendarApi.Calendar>,
});

/** 打开单日维护抽屉（setData(null) = 新建态，端点仍是 upsert） */
function onMaintain() {
  formDrawerApi.setData(null).open();
}

/** 打开区间导入抽屉 */
function onImport() {
  importDrawerApi.open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <ImportDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.attendance.calendar.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:attendance-calendar:upsert'"
          type="primary"
          @click="onMaintain"
        >
          <Plus class="size-5" />
          {{ $t('hr.attendance.calendar.maintain') }}
        </ElButton>
        <ElButton
          v-access:code="'hr:attendance-calendar:batch-import'"
          @click="onImport"
        >
          {{ $t('hr.attendance.calendar.import') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
