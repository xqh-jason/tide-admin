import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemMenuApi } from '#/api';

import { buildMenuTree, getMenuList } from '#/api';
import { $t } from '#/locales';

/** 菜单类型选项（1 目录 / 2 菜单 / 3 按钮，对齐 sys_menu.menu_type） */
export function getMenuTypeOptions() {
  return [
    { label: $t('system.menu.typeCatalog'), type: 'info', value: 1 },
    { label: $t('system.menu.typeMenu'), type: 'primary', value: 2 },
    { label: $t('system.menu.typeButton'), type: 'warning', value: 3 },
  ];
}

/**
 * 新增/编辑菜单表单 schema
 * 字段显隐与校验按 menu_type 联动：目录(1)/菜单(2) 需要 path+name，
 * 菜单(2) 需要 component，按钮(3) 需要 permission
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: getMenuTypeOptions(),
      },
      defaultValue: 2,
      fieldName: 'menu_type',
      label: $t('system.menu.menuType'),
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        api: async () => {
          const { items: menus } = await getMenuList();
          return [
            { id: 0, title: $t('system.menu.rootMenu') },
            ...buildMenuTree(menus),
          ];
        },
        checkStrictly: true,
        defaultExpandAll: true,
        labelField: 'title',
        valueField: 'id',
      },
      defaultValue: 0,
      fieldName: 'parent_id',
      label: $t('system.menu.parent'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      fieldName: 'title',
      label: $t('system.menu.menuTitle'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.menu.pathTip'),
      },
      dependencies: {
        rules: (values) => (values.menu_type === 3 ? null : 'required'),
        show: (values) => values.menu_type !== 3,
        triggerFields: ['menu_type'],
      },
      fieldName: 'path',
      label: $t('system.menu.path'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.menu.nameTip'),
      },
      dependencies: {
        rules: (values) => (values.menu_type === 3 ? null : 'required'),
        show: (values) => values.menu_type !== 3,
        triggerFields: ['menu_type'],
      },
      fieldName: 'name',
      label: $t('system.menu.name'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.menu.componentTip'),
      },
      dependencies: {
        rules: (values) => (values.menu_type === 2 ? 'required' : null),
        show: (values) => values.menu_type === 2,
        triggerFields: ['menu_type'],
      },
      fieldName: 'component',
      label: $t('system.menu.component'),
    },
    {
      component: 'IconPicker',
      dependencies: {
        show: (values) => values.menu_type !== 3,
        triggerFields: ['menu_type'],
      },
      fieldName: 'icon',
      label: $t('system.menu.icon'),
    },
    {
      component: 'InputNumber',
      defaultValue: 0,
      fieldName: 'sort',
      label: $t('system.menu.sort'),
    },
    {
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
      },
      defaultValue: 1,
      dependencies: {
        show: (values) => values.menu_type === 2,
        triggerFields: ['menu_type'],
      },
      fieldName: 'keep_alive',
      label: $t('system.menu.keepAlive'),
    },
    {
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
      },
      defaultValue: 0,
      dependencies: {
        show: (values) => values.menu_type !== 3,
        triggerFields: ['menu_type'],
      },
      fieldName: 'hidden',
      label: $t('system.menu.hideInMenu'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.menu.permissionTip'),
      },
      dependencies: {
        rules: (values) => (values.menu_type === 3 ? 'required' : null),
        show: (values) => values.menu_type === 3,
        triggerFields: ['menu_type'],
      },
      fieldName: 'permission',
      label: $t('system.menu.permission'),
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
      label: $t('system.menu.status'),
    },
  ];
}

/** 搜索表单 schema */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('system.menu.menuTitle'),
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
      label: $t('system.menu.status'),
    },
  ];
}

/** 列表列配置（树表，标题列带图标插槽） */
export function useColumns(
  onActionClick: OnActionClickFn<SystemMenuApi.SystemMenu>,
): VxeTableGridColumns<SystemMenuApi.SystemMenu> {
  return [
    {
      align: 'left',
      field: 'title',
      fixed: 'left',
      slots: { default: 'title' },
      title: $t('system.menu.menuTitle'),
      treeNode: true,
      width: 240,
    },
    {
      cellRender: { name: 'CellTag', options: getMenuTypeOptions() },
      field: 'menu_type',
      title: $t('system.menu.menuType'),
      width: 90,
    },
    { field: 'permission', title: $t('system.menu.permission'), width: 190 },
    { align: 'left', field: 'path', title: $t('system.menu.path'), width: 160 },
    {
      align: 'left',
      field: 'component',
      minWidth: 180,
      title: $t('system.menu.component'),
    },
    { field: 'sort', title: $t('system.menu.sort'), width: 70 },
    {
      cellRender: { name: 'CellTag' },
      field: 'status',
      title: $t('system.menu.status'),
      width: 90,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'title',
          nameTitle: $t('system.menu.menuTitle'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          // 按钮节点不能再有下级
          {
            code: 'append',
            show: (row: SystemMenuApi.SystemMenu) => row.menu_type !== 3,
            text: $t('system.menu.append'),
          },
          'edit',
          'delete',
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('system.menu.operation'),
      width: 200,
    },
  ];
}
