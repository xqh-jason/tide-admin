<script lang="ts" setup>
/**
 * 员工档案列表页（人事管理 · 业务域 biz/hr）。
 * 数据链路：搜索/列定义在 data.ts（含公共审计搜索项与审计列，操作列用
 * CellOperation 渲染器，权限码在列配置内声明），列表数据走
 * POST /hr/employee/list（分页，关键字匹配备注/紧急联系人），
 * 新增/编辑在 modules/form.vue 抽屉内完成。
 * 按钮权限：新建 hr:employee:create、编辑 hr:employee:update、
 * 删除 hr:employee:delete（软删，关联登录账号保留）。
 * 敏感字段（身份证/工资卡）列表直接展示后端掩码值，不做前端脱敏。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { HrEmployeeApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteEmployee, getEmployeeList } from '#/api';
import { $t } from '#/locales';
import {
  auditTimeCodec,
  useAuditSearchSchema,
} from '#/views/system/audit-search';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'HrEmployeeList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 删除员工档案（软删除，需 hr:employee:delete），成功后刷新列表 */
async function onDelete(row: HrEmployeeApi.Employee) {
  await deleteEmployee(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），edit/delete 权限码见 data.ts */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<HrEmployeeApi.Employee>) {
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
          return getEmployeeList({
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
  } as VxeTableGridOptions<HrEmployeeApi.Employee>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('hr.employee.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'hr:employee:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('hr.employee.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
