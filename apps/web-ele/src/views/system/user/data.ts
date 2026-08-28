import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemRoleApi, SystemUserApi } from '#/api';

import { z } from '#/adapter/form';
import { getRoleList } from '#/api';
import { $t } from '#/locales';

/**
 * 新增/编辑用户表单 schema
 * @param getEditId 编辑态返回用户 id，密码可选；创建态密码必填
 */
export function useFormSchema(getEditId: () => number): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('system.user.username'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: $t('system.user.nickname'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.user.passwordKeepTip'),
        showPassword: true,
      },
      fieldName: 'password',
      label: $t('system.user.password'),
      rules: z
        .string()
        .optional()
        .refine((val) => getEditId() > 0 || (val?.length ?? 0) > 0, {
          message: $t('ui.formRules.required', [$t('system.user.password')]),
        }),
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('system.user.phone'),
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('system.user.email'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: [
          { label: $t('common.enabled'), value: 1 },
          { label: $t('common.disabled'), value: 0 },
        ],
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.user.status'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: SystemRoleApi.SystemRole[]) =>
          items.map((role) => ({ label: role.role_name, value: role.id })),
        api: () => getRoleList({ page: 1, page_size: 100 }),
        multiple: true,
      },
      fieldName: 'role_ids',
      label: $t('system.user.roles'),
    },
  ];
}

/** 搜索表单 schema */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('system.user.username'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: [
          { label: $t('common.enabled'), value: 1 },
          { label: $t('common.disabled'), value: 0 },
        ],
      },
      fieldName: 'status',
      label: $t('system.user.status'),
    },
  ];
}

/** 列表列配置 */
export function useColumns(
  onStatusChange?: (
    newVal: number,
    row: SystemUserApi.SystemUser,
  ) => Promise<boolean>,
): VxeTableGridColumns<SystemUserApi.SystemUser> {
  return [
    { field: 'username', title: $t('system.user.username'), width: 140 },
    { field: 'nickname', title: $t('system.user.nickname'), width: 140 },
    { field: 'email', minWidth: 180, title: $t('system.user.email') },
    { field: 'phone', title: $t('system.user.phone'), width: 140 },
    {
      cellRender: {
        attrs: { beforeChange: onStatusChange },
        name: onStatusChange ? 'CellSwitch' : 'CellTag',
      },
      field: 'status',
      title: $t('system.user.status'),
      width: 100,
    },
    { field: 'created_at', title: $t('system.user.createTime'), width: 170 },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('system.user.operation'),
      width: 150,
    },
  ];
}
