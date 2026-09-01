import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemApiApi, SystemRoleApi } from '#/api';

import { getRoleList } from '#/api';
import { $t } from '#/locales';

/** 新增/编辑 API 表单 schema */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.api.pathTip'),
      },
      fieldName: 'path',
      label: $t('system.api.path'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
      defaultValue: 'POST',
      fieldName: 'method',
      label: $t('system.api.method'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'api_group',
      label: $t('system.api.apiGroup'),
    },
    {
      component: 'Input',
      componentProps: {
        type: 'textarea',
      },
      fieldName: 'description',
      label: $t('system.api.description'),
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
      label: $t('system.api.status'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: SystemRoleApi.SystemRole[]) =>
          items.map((role) => ({ label: role.role_name, value: role.id })),
        api: () => getRoleList({ page: 1, page_size: 100 }),
        multiple: true,
        placeholder: $t('system.api.rolesPlaceholder'),
      },
      fieldName: 'role_ids',
      label: $t('system.api.roles'),
    },
  ];
}

/** 搜索表单 schema */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('system.api.path'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
      fieldName: 'method',
      label: $t('system.api.method'),
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
      label: $t('system.api.status'),
    },
  ];
}

/** 列表列配置 */
export function useColumns(
  onActionClick?: OnActionClickFn<SystemApiApi.SystemApi>,
): VxeTableGridColumns<SystemApiApi.SystemApi> {
  return [
    { field: 'path', minWidth: 240, title: $t('system.api.path') },
    { field: 'method', title: $t('system.api.method'), width: 90 },
    { field: 'api_group', title: $t('system.api.apiGroup'), width: 140 },
    {
      field: 'description',
      minWidth: 180,
      title: $t('system.api.description'),
    },
    {
      cellRender: { name: 'CellTag' },
      field: 'status',
      title: $t('system.api.status'),
      width: 100,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'path',
          nameTitle: $t('system.api.path'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [{ code: 'edit' }, { code: 'delete', danger: true }],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.api.operation'),
      width: 140,
    },
  ];
}
