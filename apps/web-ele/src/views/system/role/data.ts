import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/** 新增/编辑角色表单 schema（menuIds 由表单插槽内的授权树维护） */
export function useFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      fieldName: 'roleName',
      label: $t('system.role.roleName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.role.roleKeyTip'),
      },
      fieldName: 'roleKey',
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
        options: statusOptions,
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
      fieldName: 'menuIds',
      formItemClass: 'items-start',
      label: $t('system.role.menus'),
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
      label: $t('system.role.roleName'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
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
  const statusOptions = useDictOptions('status');
  return [
    { field: 'roleName', title: $t('system.role.roleName'), width: 160 },
    { field: 'roleKey', title: $t('system.role.roleKey'), width: 160 },
    { field: 'sort', title: $t('system.role.sort'), width: 90 },
    {
      cellRender: {
        attrs: { auth: 'system:role:update', beforeChange: onStatusChange },
        name: onStatusChange ? 'CellSwitch' : 'CellTag',
        options: statusOptions,
      },
      field: 'status',
      title: $t('system.role.status'),
      width: 100,
    },
    { field: 'remark', minWidth: 160, title: $t('system.role.remark') },
    ...useAuditColumns<SystemRoleApi.SystemRole>(),
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'roleName',
          nameTitle: $t('system.role.roleName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          // 超管角色（super）固定不可改；编辑/删除分别受 update/delete 权限码控制
          {
            auth: 'system:role:update',
            code: 'edit',
            show: (row: SystemRoleApi.SystemRole) => row.roleKey !== 'super',
          },
          {
            auth: 'system:role:delete',
            code: 'delete',
            show: (row: SystemRoleApi.SystemRole) => row.roleKey !== 'super',
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
