import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemApiApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/** HTTP 方法选项（表单与搜索共用） */
const METHOD_OPTIONS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
];

/** 新增/编辑 API 表单 schema */
export function useFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
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
        options: METHOD_OPTIONS,
      },
      defaultValue: 'POST',
      fieldName: 'method',
      label: $t('system.api.method'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'apiGroup',
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
        options: statusOptions,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.api.status'),
    },
  ];
}

/** 搜索表单 schema */
export function useGridFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('system.api.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: METHOD_OPTIONS,
      },
      fieldName: 'method',
      label: $t('system.api.method'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
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
  const statusOptions = useDictOptions('status');
  return [
    { field: 'path', minWidth: 240, title: $t('system.api.path') },
    { field: 'method', title: $t('system.api.method'), width: 90 },
    { field: 'apiGroup', title: $t('system.api.apiGroup'), width: 140 },
    {
      field: 'description',
      minWidth: 180,
      title: $t('system.api.description'),
    },
    {
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: $t('system.api.status'),
      width: 100,
    },
    ...useAuditColumns<SystemApiApi.SystemApi>(),
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'path',
          nameTitle: $t('system.api.path'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { auth: 'system:api:update', code: 'edit' },
          { auth: 'system:api:delete', code: 'delete', danger: true },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('system.api.operation'),
      width: 140,
    },
  ];
}
