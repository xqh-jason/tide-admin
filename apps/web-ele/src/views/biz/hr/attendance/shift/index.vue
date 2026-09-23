<script lang="ts" setup>
/**
 * 班次管理列表页（考勤域 · biz/hr/attendance）。
 * 数据链路：搜索/列定义在 data.ts，列表数据走 POST /hr/attendance/shift/list
 * （分页；关键字匹配班次编码 / 名称，状态精确过滤），新增/编辑在
 * modules/form.vue 抽屉内完成。
 * 按钮权限：新建 hr:attendance-shift:create、编辑 hr:attendance-shift:update、
 * 删除 hr:attendance-shift:delete（**软删**：班次被历史排班引用，软删后旧排班仍可取名）。
 * 无独立启停端点：状态随编辑表单全量提交变更，列表状态列为只读标签。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrAttendanceShiftApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteAttendanceShift, getAttendanceShiftList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'HrAttendanceShiftList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 删除班次（软删除，需 hr:attendance-shift:delete），成功后刷新列表 */
async function onDelete(row: HrAttendanceShiftApi.Shift) {
  await deleteAttendanceShift(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），edit/delete 权限码见 data.ts */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrAttendanceShiftApi.Shift>) {
  switch (code) {
    case 'delete': {
      // await 让 CellOperation 的行级操作锁覆盖整个请求，防止连点重复删除
      await onDelete(row);
      break;
    }
    case 'edit': {
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
          return getAttendanceShiftList({
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
  } as VxeTableGridOptions<HrAttendanceShiftApi.Shift>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.attendance.shift.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:attendance-shift:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('hr.attendance.shift.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
