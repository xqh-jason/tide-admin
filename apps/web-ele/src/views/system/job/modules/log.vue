<script lang="ts" setup>
/**
 * 定时任务执行日志抽屉：从任务列表操作列进入，展示该任务的执行记录。
 * 查询固定携带 jobId（当前打开的任务）；删除/批量删除受
 * system:job-log:delete 权限码控制。搜索/列定义复用 ../data.ts。
 * 注意：日志的 status 语义为执行结果（1 成功 / 0 失败），字典 execResultStatus。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemJobApi, SystemJobLogApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteJobLog, deleteJobLogBatch, getJobLogList } from '#/api';
import { $t } from '#/locales';

import { useLogColumns, useLogGridFormSchema } from '../data';

defineOptions({ name: 'SystemJobLogPanel' });

/** 当前打开的任务（抽屉标题与日志查询用），关闭时置空 */
const currentJob = ref<null | SystemJobApi.Job>(null);

async function onDelete(row: SystemJobLogApi.JobLog) {
  await deleteJobLog(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 批量删除勾选的日志（不存在的 id 后端自动忽略） */
async function onBatchDelete() {
  const rows = gridApi.grid.getCheckboxRecords() as SystemJobLogApi.JobLog[];
  if (rows.length === 0) {
    ElMessage.warning($t('system.job.batchDeleteEmpty'));
    return;
  }
  await ElMessageBox.confirm(
    $t('system.job.batchDeleteConfirm', [rows.length]),
    $t('common.delete'),
    { type: 'warning' },
  );
  await deleteJobLogBatch(rows.map((row) => row.id));
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.grid.clearCheckboxRow();
  gridApi.query();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemJobLogApi.JobLog>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useLogGridFormSchema(),
  },
  gridOptions: {
    columns: useLogColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const job = currentJob.value;
          if (!job) {
            return { items: [], total: 0, totalPages: 0 };
          }
          return getJobLogList({
            page: page.currentPage,
            pageSize: page.pageSize,
            jobId: job.id,
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
  } as VxeTableGridOptions<SystemJobLogApi.JobLog>,
});

const drawerTitle = computed(() =>
  currentJob.value
    ? $t('system.job.logTitle', [currentJob.value.jobName])
    : $t('system.job.log'),
);

const [Drawer, drawerApi] = useVbenDrawer<null | SystemJobApi.Job>({
  async onOpenChange(isOpen) {
    if (!isOpen) {
      currentJob.value = null;
      return;
    }
    const data = drawerApi.getData();
    currentJob.value = data ?? null;
    await nextTick();
    gridApi.reload();
  },
});

defineExpose({ drawerApi });
</script>

<template>
  <Drawer class="w-[1000px]" :title="drawerTitle">
    <div class="h-[560px]">
      <Grid>
        <template #toolbar-tools>
          <ElButton
            v-access:code="'system:job-log:delete'"
            danger
            plain
            @click="onBatchDelete"
          >
            {{ $t('system.job.batchDelete') }}
          </ElButton>
        </template>
        <template #action="{ row }">
          <VbenTableAction
            :actions="[
              {
                auth: 'system:job-log:delete',
                danger: true,
                popConfirm: {
                  confirm: () =>
                    onActionClick({
                      code: 'delete',
                      row: row as SystemJobLogApi.JobLog,
                    }),
                  title: $t('ui.actionMessage.deleteConfirm', [row.id]),
                },
                text: $t('common.delete'),
              },
            ]"
            align="center"
          />
        </template>
      </Grid>
    </div>
  </Drawer>
</template>
