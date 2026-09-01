import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemDictApi } from '#/api';

import { $t } from '#/locales';

/** 新增/编辑字典表单 schema */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.dict.typeCodeTip'),
      },
      fieldName: 'type_code',
      label: $t('system.dict.typeCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'label',
      label: $t('system.dict.label'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'value',
      label: $t('system.dict.value'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      defaultValue: 0,
      fieldName: 'sort',
      label: $t('system.dict.sort'),
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
      label: $t('system.dict.status'),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.dict.remark'),
    },
  ];
}

/** 搜索表单 schema */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'type_code',
      label: $t('system.dict.typeCode'),
    },
    {
      component: 'Input',
      fieldName: 'label',
      label: $t('system.dict.label'),
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
      label: $t('system.dict.status'),
    },
  ];
}

/** 列表列配置 */
export function useColumns(
  onActionClick?: OnActionClickFn<SystemDictApi.SystemDict>,
): VxeTableGridColumns<SystemDictApi.SystemDict> {
  return [
    { field: 'type_code', title: $t('system.dict.typeCode'), width: 160 },
    { field: 'label', title: $t('system.dict.label'), width: 160 },
    { field: 'value', title: $t('system.dict.value'), width: 140 },
    { field: 'sort', title: $t('system.dict.sort'), width: 90 },
    {
      cellRender: { name: 'CellTag' },
      field: 'status',
      title: $t('system.dict.status'),
      width: 100,
    },
    { field: 'remark', minWidth: 160, title: $t('system.dict.remark') },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'label',
          nameTitle: $t('system.dict.label'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [{ code: 'edit' }, { code: 'delete', danger: true }],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.dict.operation'),
      width: 140,
    },
  ];
}
