<script lang="ts" setup>
/**
 * 用户管理列表页。
 * 数据链路：搜索/列定义在 data.ts（含公共审计搜索项与审计列），
 * 列表数据走 POST /user/list（分页），新增/编辑在 modules/form.vue 抽屉内完成。
 * 按钮权限：新建 system:user:create、编辑 system:user:update、删除 system:user:delete。
 */
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid, VbenTableAction } from '#/adapter/vxe-table';
import {
  deleteUser,
  forceLogoutUserSessions,
  getUserList,
  updateUserStatus,
} from '#/api';
import { $t } from '#/locales';

import { auditTimeCodec, useAuditSearchSchema } from '../audit-search';
import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'SystemUserList' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

/**
 * 状态开关回调（CellSwitch beforeChange）：调用 /user/update-status 切换启用/禁用；
 * 内置 admin 后端会拒绝，返回 false 让开关回弹到原状态
 */
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

/** 删除用户（软删除，需 system:user:delete），成功后刷新当前列表 */
async function onDelete(row: SystemUserApi.SystemUser) {
  await deleteUser(row.id);
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
  gridApi.query();
}

/**
 * 踢出该用户全部会话（按 userId 吊销其所有有效凭证，需 system:session:force-logout）；
 * 提示后端返回的受影响会话数，0 表示该用户当前没有在线会话。
 * 不刷新用户列表（会话变化不影响用户数据）；踢自己会立即掉线需重新登录
 */
async function onForceLogoutAll(row: SystemUserApi.SystemUser) {
  const affected = await forceLogoutUserSessions(row.id);
  if (affected === 0) {
    ElMessage.info($t('system.user.forceLogoutAllEmpty', [row.username]));
    return;
  }
  ElMessage.success($t('system.user.forceLogoutAllSuccess', [affected]));
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
          return getUserList({
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
  } as VxeTableGridOptions<SystemUserApi.SystemUser>,
});

/** 打开新建抽屉（setData(null) 表示创建态） */
function onCreate() {
  formDrawerApi.setData(null).open();
}

async function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemUserApi.SystemUser>) {
  switch (code) {
    case 'delete': {
      // await 让 VbenTableAction 的提交态覆盖整个请求，防止连点重复提交
      await onDelete(row);
      break;
    }
    case 'edit': {
      formDrawerApi.setData(row).open();
      break;
    }
    case 'forceLogoutAll': {
      await onForceLogoutAll(row);
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
      <!-- 操作列：VbenTableAction 内置权限过滤（auth 字段）。
           踢出全部会话按 userId 吊销该用户全部有效凭证，后端允许对自己操作，
           故不像编辑/删除那样排除 admin；与强制下线一致走气泡二次确认 -->
      <template #action="{ row }">
        <VbenTableAction
          :actions="[
            {
              // 内置超管 admin 不可编辑（后端拒绝），隐藏该行操作按钮
              auth: 'system:user:update',
              ifShow: (row as SystemUserApi.SystemUser).username !== 'admin',
              onClick: () =>
                onActionClick({
                  code: 'edit',
                  row: row as SystemUserApi.SystemUser,
                }),
              text: $t('common.edit'),
            },
            {
              auth: 'system:session:force-logout',
              popConfirm: {
                confirm: () =>
                  onActionClick({
                    code: 'forceLogoutAll',
                    row: row as SystemUserApi.SystemUser,
                  }),
                title: $t('system.user.forceLogoutAllConfirm', [
                  (row as SystemUserApi.SystemUser).username,
                ]),
              },
              text: $t('system.user.forceLogoutAll'),
            },
            {
              auth: 'system:user:delete',
              danger: true,
              ifShow: (row as SystemUserApi.SystemUser).username !== 'admin',
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
