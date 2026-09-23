<script lang="ts" setup>
/**
 * 加班申请列表页（人事管理 · 业务域 biz/hr）。
 * 页面路径与后端菜单 `component: "#/views/biz/hr/overtime/index.vue"` 一一对应。
 *
 * 双视角取舍：搜索表单「范围」项切换两个端点，二者字段口径不同，不能混用——
 * - `mine 我的申请`（默认）：`POST /hr/overtime/mine`，后端按当前登录账号的员工档案过滤，
 *   请求体只认 `status`（员工 / 类型 / 日期区间由查询回调裁掉）；
 * - `all 全部申请`：`POST /hr/overtime/list`，管理视角，支持员工 / 状态 / 类型 / 加班日期区间。
 *
 * 「本人」约束：加班单的写入口（create / update / submit / cancel / delete）一律要求单据归属
 * = 操作人账号（后端 `ensure_actor_is_employee`），故行内写操作只在 `mine` 范围展示，
 * `all` 范围只保留只读「详情」——管理视角不代他人改单 / 撤单 / 删单。
 *
 * 按钮权限：新建 hr:overtime:create、修改 hr:overtime:update、重新提交 hr:overtime:submit、
 * 撤销 hr:overtime:cancel、删除 hr:overtime:delete。
 * 状态机（后端 `service.rs`）：create 建单即提交 → 1 审批中；update / submit 仅
 * 3 已驳回 / 4 已撤销；cancel 仅 1 审批中；delete 软删（审批中先撤在途实例，其余直接软删）。
 * 防连点：抽屉内 `lock()` + await + `unlock()`；行内操作走 VbenTableAction 气泡确认
 * （确认期间按钮置 loading 且忽略重复触发），`onActionClick` 一律 async 且 await 请求。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrOvertimeApi } from '#/api';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import {
  cancelOvertime,
  deleteOvertime,
  getMyOvertimeList,
  getOvertimeList,
  submitOvertime,
} from '#/api';
import { $t } from '#/locales';
import { resolveMyEmployee } from '#/views/biz/hr/shared/employee-select';

import { useColumns, useGridFormSchema } from './data';
import Detail from './modules/detail.vue';
import Form from './modules/form.vue';

defineOptions({ name: 'HrOvertimeList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

/** 当前查询范围，由列表 query 回填（初值与搜索表单 defaultValue 一致），用于行内写操作显隐 */
const currentScope = ref<'all' | 'mine'>('mine');
/** 建单前置解析（当前账号档案）进行中：工具栏按钮自持提交态，防连点 */
const resolving = ref(false);

/**
 * 打开新建抽屉：先把当前账号解析成员工档案（写入口一律「本人」），
 * 解析不到档案时**不发建单请求**，直接提示并中止。
 */
async function onCreate() {
  if (resolving.value) return;
  resolving.value = true;
  try {
    const employee = await resolveMyEmployee();
    if (!employee) {
      ElMessage.error($t('hr.common.noEmployeeProfile'));
      return;
    }
    formDrawerApi
      .setData({
        employeeId: employee.id,
        employeeName: employee.userName || `#${employee.id}`,
        record: null,
      })
      .open();
  } finally {
    resolving.value = false;
  }
}

/** 仅「已驳回 / 已撤销」可改、可重提（后端状态机） */
function isEditable(row: HrOvertimeApi.Overtime) {
  return row.status === 3 || row.status === 4;
}

/** 仅「审批中」可撤销 */
function isCancelable(row: HrOvertimeApi.Overtime) {
  return row.status === 1;
}

/** 行内操作统一入口：VbenTableAction 的 popConfirm.confirm 内调用，一律 await 请求 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrOvertimeApi.Overtime>) {
  switch (code) {
    case 'cancel': {
      await cancelOvertime(row.id);
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      gridApi.query();
      break;
    }
    case 'delete': {
      await deleteOvertime(row.id);
      ElMessage.success(
        $t('ui.actionMessage.deleteSuccess', [$t('hr.overtime.title')]),
      );
      gridApi.query();
      break;
    }
    case 'detail': {
      detailDrawerApi.setData(row).open();
      break;
    }
    case 'edit': {
      formDrawerApi
        .setData({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          record: row,
        })
        .open();
      break;
    }
    case 'submit': {
      await submitOvertime(row.id);
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
      gridApi.query();
      break;
    }
  }
}

/**
 * 行内操作：权限码（auth）+ 状态机（ifShow）双重显隐，写操作一律气泡二次确认；
 * `all` 管理视角只留只读「详情」（写入口只服务本人单据）。
 */
function rowActions(row: HrOvertimeApi.Overtime) {
  const mine = currentScope.value === 'mine';
  return [
    {
      onClick: () => onActionClick({ code: 'detail', row }),
      text: $t('common.detail'),
    },
    {
      auth: 'hr:overtime:update',
      ifShow: mine && isEditable(row),
      onClick: () => onActionClick({ code: 'edit', row }),
      text: $t('common.edit'),
    },
    {
      auth: 'hr:overtime:submit',
      ifShow: mine && isEditable(row),
      popConfirm: {
        confirm: () => onActionClick({ code: 'submit', row }),
        title: $t('hr.overtime.submitConfirm'),
      },
      text: $t('hr.overtime.submit'),
    },
    {
      auth: 'hr:overtime:cancel',
      ifShow: mine && isCancelable(row),
      popConfirm: {
        confirm: () => onActionClick({ code: 'cancel', row }),
        title: $t('hr.overtime.cancelConfirm'),
      },
      text: $t('hr.overtime.cancel'),
    },
    {
      auth: 'hr:overtime:delete',
      danger: true,
      ifShow: mine,
      popConfirm: {
        confirm: () => onActionClick({ code: 'delete', row }),
        title: $t('hr.overtime.deleteConfirm'),
      },
      text: $t('common.delete'),
    },
  ];
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
          const { scope = 'mine', workDateRange, ...rest } = formValues;
          const mine = scope !== 'all';
          currentScope.value = mine ? 'mine' : 'all';
          if (mine) {
            // 本人视角端点只认状态过滤（归属由后端按当前账号档案收口）
            return getMyOvertimeList({
              page: page.currentPage,
              pageSize: page.pageSize,
              status: rest.status,
            });
          }
          const [workDateBegin, workDateEnd] = Array.isArray(workDateRange)
            ? workDateRange
            : [];
          return getOvertimeList({
            employeeId: rest.employeeId,
            overtimeType: rest.overtimeType,
            page: page.currentPage,
            pageSize: page.pageSize,
            status: rest.status,
            workDateBegin,
            workDateEnd,
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
  } as VxeTableGridOptions<HrOvertimeApi.Overtime>,
});
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <DetailDrawer />
    <Grid :table-title="$t('hr.overtime.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:overtime:create'"
          :loading="resolving"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('hr.overtime.title')]) }}
        </ElButton>
      </template>
      <!-- 操作列：VbenTableAction 内置权限过滤（auth）+ 状态机显隐（ifShow），
           写操作走气泡二次确认，确认期间按钮 loading 防连点 -->
      <template #action="{ row }">
        <VbenTableAction
          :actions="rowActions(row as HrOvertimeApi.Overtime)"
          align="center"
        />
      </template>
    </Grid>
  </Page>
</template>
