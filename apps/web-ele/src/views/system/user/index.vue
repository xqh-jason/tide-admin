<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import { deleteUser, getUserList, updateUserStatus } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'SystemUserList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

async function onStatusChange(
  newVal: number,
  row: SystemUserApi.SystemUser,
): Promise<boolean> {
  try {
    await updateUserStatus(row.id, newVal as 0 | 1);
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
    return true;
  } catch {
    return false;
  }
}

async function onDelete(row: SystemUserApi.SystemUser) {
  await deleteUser(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onStatusChange),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return getUserList({
            page: page.currentPage,
            page_size: page.pageSize,
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
  } as VxeTableGridOptions<SystemUserApi.SystemUser>,
});

function onCreate() {
  formDrawerApi.setData(null).open();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemUserApi.SystemUser>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'edit': {
      formDrawerApi.setData(row).open();
      break;
    }
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="() => gridApi.query()" />
    <Grid :table-title="$t('system.user.list')">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:user:create'"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.user.title')]) }}
        </ElButton>
      </template>
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              auth: 'system:user:update',
              onClick: () =>
                onActionClick({
                  code: 'edit',
                  row: row as SystemUserApi.SystemUser,
                }),
              text: $t('common.edit'),
            },
          ]"
          :dropdown-actions="[
            {
              auth: 'system:user:delete',
              danger: true,
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'delete',
                    row: row as SystemUserApi.SystemUser,
                  }),
                title: $t('ui.actionMessage.deleteConfirm', [row.username]),
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
