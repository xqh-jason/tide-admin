<script lang="ts" setup>
/**
 * 审批流配置列表页（人事管理 · 业务域 biz/hr/approval）。
 * 数据链路：搜索/列定义在 data.ts（操作列用 CellOperation 渲染器，权限码在列配置内声明），
 * 列表数据走 POST /hr/approval/flow/list（分页，keyword 匹配业务类型 / 模板名称）。
 * 新增/编辑在 modules/form.vue 抽屉，行内「节点维护」在 modules/nodes.vue 抽屉。
 * 按钮权限：新建 hr:approval-flow:create、编辑 hr:approval-flow:update、
 * 删除 hr:approval-flow:delete（软删，该模板有审批中单据时后端拒绝）、
 * 节点维护 hr:approval-flow-node:upsert（节点新增/修改/删除共用）。
 * 无审计搜索项：后端 FlowListReq 只支持 keyword / status 过滤（审计列仍复用公共 useAuditColumns）。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrApprovalFlowApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteApprovalFlow, getApprovalFlowList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Nodes from './modules/nodes.vue';

defineOptions({ name: 'HrApprovalFlowList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

// 节点维护抽屉：按行传入模板，抽屉内自持节点列表与新增/编辑表单
const [NodesDrawer, nodesDrawerApi] = useVbenDrawer({
  connectedComponent: Nodes,
  destroyOnClose: true,
});

/** 删除审批流模板（软删，需 hr:approval-flow:delete），成功后刷新列表 */
async function onDelete(row: HrApprovalFlowApi.Flow) {
  await deleteApprovalFlow(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），edit/delete/nodes 权限码见 data.ts */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrApprovalFlowApi.Flow>) {
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
    case 'nodes': {
      nodesDrawerApi.setData(row).open();
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    // 搜索项：keyword（业务类型 / 模板名称模糊）/ status（启用状态），与 FlowListReq 一一对应
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getApprovalFlowList({
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
  } as VxeTableGridOptions<HrApprovalFlowApi.Flow>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <NodesDrawer />
    <Grid :table-title="$t('hr.approval.flow.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:approval-flow:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('hr.approval.flow.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
