<script lang="ts" setup>
/**
 * 定时任务管理列表页。
 * 数据链路：搜索/列定义在 data.ts（含公共审计搜索项与审计列），
 * 列表数据走 POST /job/list（分页），新增/编辑在 modules/form.vue 抽屉内完成，
 * 执行日志在 modules/log.vue 抽屉内查看。
 * 按钮权限：新建 system:job:create、编辑 system:job:update、
 * 删除 system:job:delete、启停 system:job:update-status、
 * 立即执行 system:job:run-once。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemJobApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteJob, getJobList, runJobOnce, updateJobStatus } from '#/api';
import { $t } from '#/locales';

import { auditTimeCodec, useAuditSearchSchema } from '../audit-search';
import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Log from './modules/log.vue';

defineOptions({ name: 'SystemJobList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [LogDrawer, logDrawerApi] = useVbenDrawer({
  connectedComponent: Log,
  destroyOnClose: true,
});

/**
 * 状态开关回调（CellSwitch beforeChange）：先二次确认，再调用
 * /job/update-status 切换启用/停用并同步调度器；取消/失败返回 false 回弹
 */
async function onStatusChange(
  newVal: number,
  row: SystemJobApi.Job,
): Promise<boolean> {
  try {
    await ElMessageBox.confirm(
      $t('system.job.statusChangeConfirm', [
        row.jobName,
        newVal === 1 ? $t('common.enabled') : $t('common.disabled'),
      ]),
      $t('common.confirm'),
      { type: 'warning' },
    );
  } catch {
    return false;
  }
  try {
    await updateJobStatus(row.id, newVal as 0 | 1);
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    return true;
  } catch {
    return false;
  }
}

/**
 * 立即执行一次（异步触发）：接口成功仅代表已触发，
 * 不刷新任务列表，提示引导到执行日志查看结果
 */
async function onRunOnce(row: SystemJobApi.Job) {
  await runJobOnce(row.id);
  ElMessage.success($t('system.job.runOnceSuccess'));
}

/** 删除任务（软删除并移除调度，需 system:job:delete），成功后刷新当前列表 */
async function onDelete(row: SystemJobApi.Job) {
  await deleteJob(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

function onActionClick({ code, row }: OnActionClickParams<SystemJobApi.Job>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'edit': {
      formDrawerApi.setData(row).open();
      break;
    }
    case 'log': {
      logDrawerApi.setData(row).open();
      break;
    }
    case 'runOnce': {
      onRunOnce(row);
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
    columns: useColumns(onStatusChange),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getJobList({
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
  } as VxeTableGridOptions<SystemJobApi.Job>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <LogDrawer />
    <Grid :table-title="$t('system.job.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:job:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.job.title')]) }}
        </ElButton>
      </template>
      <!-- 操作列：VbenTableAction 内置权限过滤（auth 字段），
           立即执行/删除走二次确认；执行日志为只读查看，不加权限码 -->
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              auth: 'system:job:update',
              onClick: () =>
                onActionClick({
                  code: 'edit',
                  row: row as SystemJobApi.Job,
                }),
              text: $t('common.edit'),
            },
            {
              auth: 'system:job:run-once',
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'runOnce',
                    row: row as SystemJobApi.Job,
                  }),
                title: $t('system.job.runOnceConfirm', [row.jobName]),
              },
              text: $t('system.job.runOnce'),
            },
            {
              onClick: () =>
                onActionClick({
                  code: 'log',
                  row: row as SystemJobApi.Job,
                }),
              text: $t('system.job.log'),
            },
            {
              auth: 'system:job:delete',
              danger: true,
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'delete',
                    row: row as SystemJobApi.Job,
                  }),
                title: $t('ui.actionMessage.deleteConfirm', [row.jobName]),
              },
              text: $t('common.delete'),
            },
          ]"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
