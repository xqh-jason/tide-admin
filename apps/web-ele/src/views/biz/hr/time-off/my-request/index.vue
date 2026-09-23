<script lang="ts" setup>
/**
 * 我的请假页（人事管理 · **本人视角，全操作**）。
 *
 * 数据链路：搜索项/列定义在 data.ts（行内操作按状态机 + 权限码过滤），
 * 列表走 POST /hr/time-off/request/mine（后端按登录用户关联的员工档案过滤，
 * **不收 `employeeId`**）；新建/修改在 modules/form.vue 抽屉内完成
 * （创建走 POST /hr/time-off/request/create，**建单即提交**）；
 * 详情抽屉（modules/detail.vue）展示单据 + 审批进度（复用 `../request/modules/detail.vue`）。
 *
 * 写操作与后端约束（全部要求单据归属 = 本人，service 内 `ensure_request_owner`）：
 * - 新建 `hr:time-off-request:create`：`employeeId` 取本人档案，取不到即中止；
 * - 修改 `hr:time-off-request:update` / 重提 `hr:time-off-request:submit`：仅「已驳回 / 已撤销」；
 * - 撤销 `hr:time-off-request:cancel`：仅「审批中」（撤销后释放预占额度）；
 * - 删除 `hr:time-off-request:delete`：软删，「审批中」需先撤销。
 * 所有行内操作都 await 请求（CellOperation 的行级锁据此覆盖整个请求，防连点），
 * 撤销 / 重提另有 ElMessageBox 二次确认。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrTimeOffRequestApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  cancelTimeOffRequest,
  deleteTimeOffRequest,
  getMyTimeOffRequestList,
  submitTimeOffRequest,
} from '#/api';
import { $t } from '#/locales';

// 详情抽屉与 HR 视角（请假申请页）读的是同一份 TimeOffRequestResp，
// 直接复用同一组件（避免维护两份同构抽屉，也少一层包装组件）
import DetailDrawer from '../request/modules/detail.vue';
import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'HrTimeOffMyRequestList' });

// 新建 / 修改抽屉（setData(null) 为创建态，传行为编辑态）
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

// 详情抽屉：单据字段 + 审批进度
const [Detail, detailApi] = useVbenDrawer({
  connectedComponent: DetailDrawer,
  destroyOnClose: true,
});

/** 撤销请假单（仅审批中；审批侧终态分派会释放预占额度），成功后刷新列表 */
async function onCancel(row: HrTimeOffRequestApi.TimeOffRequest) {
  try {
    await ElMessageBox.confirm(
      $t('hr.timeOff.myRequest.cancelConfirm'),
      $t('hr.timeOff.myRequest.cancel'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('common.confirm'),
        type: 'warning',
      },
    );
  } catch {
    // 用户放弃：不改数据
    return;
  }
  await cancelTimeOffRequest(row.id);
  ElMessage.success($t('hr.timeOff.myRequest.cancelSuccess'));
  gridApi.query();
}

/** 重新提交（仅已驳回 / 已撤销；后端重新派生时长、预占额度并起新实例） */
async function onSubmit(row: HrTimeOffRequestApi.TimeOffRequest) {
  try {
    await ElMessageBox.confirm(
      $t('hr.timeOff.myRequest.submitConfirm'),
      $t('hr.timeOff.myRequest.submit'),
      {
        cancelButtonText: $t('common.cancel'),
        confirmButtonText: $t('common.confirm'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  await submitTimeOffRequest(row.id);
  ElMessage.success($t('hr.timeOff.myRequest.submitSuccess'));
  gridApi.query();
}

/** 删除请假单（软删；确认文案在 data.ts 的 confirmTitle 上，此处只负责请求） */
async function onDelete(row: HrTimeOffRequestApi.TimeOffRequest) {
  await deleteTimeOffRequest(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发）；写操作 await 以覆盖行级锁 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrTimeOffRequestApi.TimeOffRequest>) {
  switch (code) {
    case 'cancel': {
      await onCancel(row);
      break;
    }
    case 'delete': {
      await onDelete(row);
      break;
    }
    case 'detail': {
      detailApi.setData(row).open();
      break;
    }
    case 'edit': {
      formDrawerApi.setData(row).open();
      break;
    }
    case 'submit': {
      await onSubmit(row);
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
          return getMyTimeOffRequestList({
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

/** 打开新建抽屉（创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Detail />
    <Grid :table-title="$t('hr.timeOff.myRequest.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:time-off-request:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('hr.timeOff.myRequest.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
