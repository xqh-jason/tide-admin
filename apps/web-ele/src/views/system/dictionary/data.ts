import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemDictionaryApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/** 字典类型新增/编辑表单 schema */
export function useTypeFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.dictionary.name'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.dictionary.typeCodeTip'),
      },
      fieldName: 'type',
      label: $t('system.dictionary.typeCode'),
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: statusOptions,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.dictionary.status'),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.dictionary.remark'),
    },
  ];
}

/** 字典类型搜索表单 schema（keyword 命中 name / type） */
export function useGridFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.dictionary.typeKeywordTip'),
      },
      fieldName: 'keyword',
      label: $t('system.dictionary.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.dictionary.status'),
    },
  ];
}

/** 字典类型列表列配置 */
export function useColumns(): VxeTableGridColumns<SystemDictionaryApi.Dictionary> {
  const statusOptions = useDictOptions('status');
  return [
    { field: 'name', title: $t('system.dictionary.name'), width: 160 },
    { field: 'type', title: $t('system.dictionary.typeCode'), width: 160 },
    {
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: $t('system.dictionary.status'),
      width: 100,
    },
    { field: 'remark', minWidth: 180, title: $t('system.dictionary.remark') },
    ...useAuditColumns<SystemDictionaryApi.Dictionary>(),
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('system.dictionary.operation'),
      width: 170,
    },
  ];
}

/** 字典项新增/编辑表单 schema */
export function useDetailFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      fieldName: 'label',
      label: $t('system.dictionary.label'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'value',
      label: $t('system.dictionary.value'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.dictionary.extendTip'),
      },
      fieldName: 'extend',
      label: $t('system.dictionary.extend'),
    },
    {
      component: 'InputNumber',
      defaultValue: 0,
      fieldName: 'sort',
      label: $t('system.dictionary.sort'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: statusOptions,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.dictionary.status'),
    },
  ];
}

/** 字典项搜索表单 schema（keyword 命中 label / value） */
export function useDetailGridSearchSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.dictionary.itemKeywordTip'),
      },
      fieldName: 'keyword',
      label: $t('system.dictionary.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.dictionary.status'),
    },
  ];
}

/** 字典项列表列配置 */
export function useDetailColumns(): VxeTableGridColumns<SystemDictionaryApi.DictionaryDetail> {
  const statusOptions = useDictOptions('status');
  return [
    { field: 'label', title: $t('system.dictionary.label'), width: 160 },
    { field: 'value', title: $t('system.dictionary.value'), width: 150 },
    { field: 'extend', title: $t('system.dictionary.extend'), width: 130 },
    { field: 'sort', title: $t('system.dictionary.sort'), width: 80 },
    {
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: $t('system.dictionary.status'),
      width: 100,
    },
    ...useAuditColumns<SystemDictionaryApi.DictionaryDetail>(),
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('system.dictionary.operation'),
      width: 150,
    },
  ];
}
