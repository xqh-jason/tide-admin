<script lang="ts" setup>
/**
 * 额度发放列表页（人事管理 · 假期额度 / 发放）。
 * 数据链路：搜索/列定义在 data.ts，列表数据走 POST /hr/time-off/grant/list
 * （分页；员工 / 假期类型 / 发放依据 / 归属周期 / 状态过滤），批量发放走
 * modules/form.vue 抽屉（POST /hr/time-off/grant/batch-create）。
 * 契约要点：批次是额度的事实来源，行内「撤销发放」调用
 * POST /hr/time-off/grant/cancel（后端作废批次 + 账户回冲 + 反向流水），
 * **仅 status = 1 有效**的批次可撤销，故按行状态显隐；
 * `TimeOffGrantListReq` 无审计 / 时间范围过滤字段，搜索区只挂 data.ts 的
 * useGridFormSchema()。
 * 按钮权限：批量发放 hr:time-off-grant:create、撤销发放 hr:time-off-grant:cancel。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrTimeOffGrantApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { cancelTimeOffGrant, getTimeOffGrantList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'HrTimeOffGrantList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 撤销发放（需 hr:time-off-grant:cancel）：作废批次并回冲额度，成功后刷新列表 */
async function onCancel(row: HrTimeOffGrantApi.Grant) {
  await cancelTimeOffGrant(row.id);
  ElMessage.success($t('hr.timeOff.grant.cancelSuccess'));
  gridApi.query();
}

/** 行内操作统一入口（VbenTableAction popConfirm 确认后分发），await 覆盖整个请求 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrTimeOffGrantApi.Grant>) {
  switch (code) {
    case 'cancel': {
      // await 让 VbenTableAction 的提交态覆盖整个请求，防止连点重复撤销
      await onCancel(row);
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getTimeOffGrantList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
            // period 后端是精确等值过滤（Period.eq），输入框清空会留下空串，
            // 空串会被当成「周期 = ''」把结果过滤空，故为空时不下发该参数
            period: formValues?.period || undefined,
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
  } as VxeTableGridOptions<HrTimeOffGrantApi.Grant>,
});

/** 打开批量发放抽屉 */
function onBatchCreate() {
  formDrawerApi.open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.timeOff.grant.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:time-off-grant:create'"
          type="primary"
          @click="onBatchCreate"
        >
          <Plus class="size-5" />
          {{ $t('hr.timeOff.grant.batchCreate') }}
        </ElButton>
      </template>
      <!-- 操作列：VbenTableAction 内置权限过滤（auth）+ 气泡二次确认；
           撤销仅对「有效」批次开放（后端拒绝其他状态），ifShow 做行级显隐 -->
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              auth: 'hr:time-off-grant:cancel',
              danger: true,
              ifShow: (row as HrTimeOffGrantApi.Grant).status === 1,
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'cancel',
                    row: row as HrTimeOffGrantApi.Grant,
                  }),
                title: $t('hr.timeOff.grant.cancelConfirmTip', [
                  (row as HrTimeOffGrantApi.Grant).employeeName,
                  (row as HrTimeOffGrantApi.Grant).timeOffTypeName,
                ]),
              },
              text: $t('hr.timeOff.grant.cancel'),
            },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
