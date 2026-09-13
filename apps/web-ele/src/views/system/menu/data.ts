import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemMenuApi } from '#/api';

import { buildMenuTree, getMenuList } from '#/api';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/** 菜单类型选项（1 目录 / 2 菜单 / 3 按钮，对齐 sys_menu.menuType） */
export function getMenuTypeOptions() {
  return [
    { label: $t('system.menu.typeCatalog'), type: 'info', value: 1 },
    { label: $t('system.menu.typeMenu'), type: 'primary', value: 2 },
    { label: $t('system.menu.typeButton'), type: 'warning', value: 3 },
  ];
}

/**
 * 新增/编辑菜单表单 schema
 * 字段显隐与校验按 menuType 联动：目录(1)/菜单(2) 需要 path+name，
 * 菜单(2) 需要 component，按钮(3) 需要 permission
 */
export function useFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: getMenuTypeOptions(),
      },
      defaultValue: 2,
      fieldName: 'menuType',
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
      fieldName: 'parentId',
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
        rules: (values) => (values.menuType === 3 ? null : 'required'),
        show: (values) => values.menuType !== 3,
        triggerFields: ['menuType'],
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
        rules: (values) => (values.menuType === 3 ? null : 'required'),
        show: (values) => values.menuType !== 3,
        triggerFields: ['menuType'],
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
        rules: (values) => (values.menuType === 2 ? 'required' : null),
        show: (values) => values.menuType === 2,
        triggerFields: ['menuType'],
      },
      fieldName: 'component',
      label: $t('system.menu.component'),
    },
    {
      component: 'IconPicker',
      dependencies: {
        show: (values) => values.menuType !== 3,
        triggerFields: ['menuType'],
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
        show: (values) => values.menuType === 2,
        triggerFields: ['menuType'],
      },
      fieldName: 'keepAlive',
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
        show: (values) => values.menuType !== 3,
        triggerFields: ['menuType'],
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
        rules: (values) => (values.menuType === 3 ? 'required' : null),
        show: (values) => values.menuType === 3,
        triggerFields: ['menuType'],
      },
      fieldName: 'permission',
      label: $t('system.menu.permission'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: statusOptions,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.menu.status'),
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.menu.nameKeywordTip'),
      },
      // 后端 keyword 仅对路由 name 模糊匹配（title/path 不参与），引导按 name 搜索
      fieldName: 'keyword',
      label: $t('system.menu.name'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.menu.status'),
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<SystemMenuApi.SystemMenu>,
): VxeTableGridColumns<SystemMenuApi.SystemMenu> {
  const statusOptions = useDictOptions('status');
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
      field: 'menuType',
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
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: $t('system.menu.status'),
      width: 90,
    },
    ...useAuditColumns<SystemMenuApi.SystemMenu>(),
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
          // 按钮节点不能再有下级；append 为新增子菜单，走 create 权限码
          {
            auth: 'system:menu:create',
            code: 'append',
            show: (row: SystemMenuApi.SystemMenu) => row.menuType !== 3,
            text: $t('system.menu.append'),
          },
          { auth: 'system:menu:update', code: 'edit' },
          {
            auth: 'system:menu:delete',
            code: 'delete',
            // 后端 /menu/delete 为级联软删（连同全部子孙并解除角色绑定），确认文案显式警示
            confirmTitle: (row: SystemMenuApi.SystemMenu) =>
              $t('system.menu.deleteCascadeTip', [row.title]),
          },
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
