<script lang="ts" setup>
/**
 * 假期类型列表页（人事管理 · 假期额度 / 类型）。
 * 数据链路：搜索/列定义在 data.ts（操作列用 CellOperation 渲染器，权限码在列配置内声明），
 * 列表数据走 POST /hr/time-off/type/list（分页，keyword 模糊编码/名称 + status 精确过滤），
 * 新增/编辑在 modules/form.vue 抽屉内完成。
 * 契约要点：`typeCode` 单列唯一（含软删占位），删除是软删且已有额度批次的类型后端拒绝；
 * `TimeOffTypeListReq` 不支持审计字段过滤，故搜索区只挂 data.ts 的
 * useGridFormSchema()（审计信息在列与抽屉内只读展示）。
 * 按钮权限：新建 hr:time-off-type:create、编辑 hr:time-off-type:update、
 * 删除 hr:time-off-type:delete。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrTimeOffTypeApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteTimeOffType, getTimeOffTypeList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'HrTimeOffTypeList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 删除假期类型（软删，需 hr:time-off-type:delete），成功后刷新列表 */
async function onDelete(row: HrTimeOffTypeApi.TimeOffType) {
  await deleteTimeOffType(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），edit/delete 权限码见 data.ts */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrTimeOffTypeApi.TimeOffType>) {
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
          return getTimeOffTypeList({
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
  } as VxeTableGridOptions<HrTimeOffTypeApi.TimeOffType>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.timeOff.type.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:time-off-type:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('hr.timeOff.type.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
