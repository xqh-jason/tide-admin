<script lang="ts" setup>
/**
 * 出勤记录列表页（人事管理 · 业务域 biz/hr/attendance/record）。
 * 后端契约（`modules/biz/hr/attendance/dto.rs`）：
 * - 列表走 POST /hr/attendance/record/list（`RecordListReq`：员工 / 来源 / 缺卡 /
 *   出勤日区间过滤，分页 `page`/`pageSize`）；
 * - `hr_attendance_record` 是**事实表、不软删**，也没有删除端点：
 *   本地修正走「补录」（按主键 update），第三方数据走「导入」（归一化行数组）；
 * - 迟到 / 早退 / 实际出勤 / 缺卡都是服务端按「打卡时间 vs 当日班次窗口」回算的
 *   事实值，前端只展示、不推算。
 * 按钮权限：补录 hr:attendance-record:update（行内权限码在 data.ts 声明）、
 * 导入 hr:attendance-record:import。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrAttendanceRecordApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Inbox } from '@vben/icons';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getAttendanceRecordList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Import from './modules/import.vue';

defineOptions({ name: 'HrAttendanceRecordList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [ImportDrawer, importDrawerApi] = useVbenDrawer({
  connectedComponent: Import,
  destroyOnClose: true,
});

/**
 * 操作列统一入口（CellOperation onClick 分发，权限码见 data.ts）：
 * 「补录」打开事实修正抽屉（按主键 update，打卡时间三态提交）
 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrAttendanceRecordApi.Record>) {
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
          return getAttendanceRecordList({
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
  } as VxeTableGridOptions<HrAttendanceRecordApi.Record>,
});

/** 打开导入抽屉（粘贴归一化 JSON 行数组，第三方考勤平台对接面） */
function onImport() {
  importDrawerApi.open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <ImportDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.attendance.record.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:attendance-record:import'"
          type="primary"
          @click="onImport"
        >
          <Inbox class="size-5" />
          {{ $t('hr.attendance.record.import') }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
