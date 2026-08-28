import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { $t } from '#/locales';

/** 新增/编辑角色表单 schema（menu_ids 由表单插槽内的授权树维护） */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'role_name',
      label: $t('system.role.roleName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.role.roleKeyTip'),
      },
      fieldName: 'role_key',
      label: $t('system.role.roleKey'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      defaultValue: 0,
      fieldName: 'sort',
      label: $t('system.role.sort'),
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
      label: $t('system.role.status'),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.role.remark'),
    },
    {
      // 渲染被 list/form 中按 fieldName 命名的插槽接管
      component: 'Input',
      fieldName: 'menu_ids',
      formItemClass: 'items-start',
      label: $t('system.role.menus'),
    },
  ];
}

/** 搜索表单 schema */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('system.role.roleName'),
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
      label: $t('system.role.status'),
    },
  ];
}

/** 列表列配置（操作列走 CellOperation 渲染器） */
export function useColumns(
  onStatusChange?: (
    newVal: number,
    row: SystemRoleApi.SystemRole,
  ) => Promise<boolean>,
  onActionClick?: OnActionClickFn<SystemRoleApi.SystemRole>,
): VxeTableGridColumns<SystemRoleApi.SystemRole> {
  return [
    { field: 'role_name', title: $t('system.role.roleName'), width: 160 },
    { field: 'role_key', title: $t('system.role.roleKey'), width: 160 },
    { field: 'sort', title: $t('system.role.sort'), width: 90 },
    {
      cellRender: {
        attrs: { beforeChange: onStatusChange },
        name: onStatusChange ? 'CellSwitch' : 'CellTag',
      },
      field: 'status',
      title: $t('system.role.status'),
      width: 100,
    },
    { field: 'remark', minWidth: 160, title: $t('system.role.remark') },
    { field: 'created_at', title: $t('system.role.createTime'), width: 170 },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'role_name',
          nameTitle: $t('system.role.roleName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          // 超管角色（super）固定不可改
          {
            code: 'edit',
            show: (row: SystemRoleApi.SystemRole) => row.role_key !== 'super',
          },
          {
            code: 'delete',
            show: (row: SystemRoleApi.SystemRole) => row.role_key !== 'super',
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 140,
    },
  ];
}
