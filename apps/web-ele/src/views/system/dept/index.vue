<script lang="ts" setup>
/**
 * 部门管理列表页（树表）。
 * 数据链路：getDeptList 返回后端组装好的部门树（含停用节点）；
 * 因 /dept/list 不提供过滤参数，keyword/status 搜索由 filterDeptTree
 * 在前端完成，再拍平交给 vxe treeConfig transform 组树渲染。
 * 列/搜索定义在 data.ts（append/edit/delete 权限码在列配置内声明），
 * 新增/编辑在 modules/form.vue 抽屉内完成。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemDeptApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteDept,
  filterDeptTree,
  flattenDeptTree,
  getDeptList,
} from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'SystemDeptList' });

// 打开数据三种形态：null（新建顶级）/ { parentId }（append 子部门）/ 整行（编辑）
const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 删除部门（软删除，需 system:dept:delete），成功后重新拉取整棵树 */
async function onDelete(row: SystemDeptApi.SystemDept) {
  await deleteDept(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/** 操作列统一入口（CellOperation onClick 分发），append 为新增下级部门 */
async function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemDeptApi.SystemDept>) {
  switch (code) {
    case 'append': {
      // 携带父部门 id 打开创建态，表单内 parentId 自动选中
      formDrawerApi.setData({ parentId: row.id }).open();
      break;
    }
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
    // 后端 /dept/list 无过滤参数：keyword/status 由前端过滤（filterDeptTree）
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    // 树表：不分页，后端整树拉取后拍平、按 parentId 组树并默认展开
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_params, formValues) => {
          const tree = await getDeptList();
          const filtered = filterDeptTree(tree, {
            keyword: formValues?.keyword,
            status: formValues?.status,
          });
          const items = flattenDeptTree(filtered);
          return { items, total: items.length, totalPages: 1 };
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
    treeConfig: {
      expandAll: true,
      parentField: 'parentId',
      rowField: 'id',
      transform: true,
    },
  } as VxeTableGridOptions<SystemDeptApi.SystemDept>,
});

/** 打开新建顶级部门抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('system.dept.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:dept:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.dept.title')]) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
