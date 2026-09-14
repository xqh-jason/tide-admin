<script lang="ts" setup>
/**
 * 职位管理列表页（职务维度主数据）。
 * 数据链路：搜索/列定义在 data.ts（含公共审计搜索项与审计列，操作列用
 * CellOperation 渲染器，权限码在列配置内声明），列表数据走 POST /position/list
 * （分页），新增/编辑在 modules/form.vue 抽屉内完成。
 * 按钮权限：新建 system:position:create、编辑 system:position:update、
 * 删除 system:position:delete（已被用户挂载时后端拒绝）。
 * 无独立启停端点：状态经编辑表单全量提交变更，列表状态列为只读标签。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemPositionApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deletePosition, getPositionList } from '#/api';
import { $t } from '#/locales';

import { auditTimeCodec, useAuditSearchSchema } from '../audit-search';
import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'SystemPositionList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 删除职位（软删除，需 system:position:delete），成功后刷新列表 */
async function onDelete(row: SystemPositionApi.Position) {
  await deletePosition(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），edit/delete 权限码见 data.ts */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemPositionApi.Position>) {
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
    schema: [...useGridFormSchema(), ...useAuditSearchSchema()],
    // 时间范围控件值拆为 createdAtBegin/createdAtEnd 等请求参数
    codec: auditTimeCodec,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getPositionList({
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
  } as VxeTableGridOptions<SystemPositionApi.Position>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('system.position.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:position:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.position.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
