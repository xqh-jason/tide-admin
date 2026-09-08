import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/** 新增/编辑角色表单 schema（菜单/API 权限区块由 form.vue 独立渲染，不走表单字段） */
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
        attrs: {
          auth: 'system:role:update',
          beforeChange: onStatusChange,
          // 内置超管角色（super）状态不可变更（后端拒绝），不展示开关，只读标签
          show: (row: SystemRoleApi.SystemRole) => row.roleKey !== 'super',
        },
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
      showOverflow: false,
      title: $t('system.role.operation'),
      width: 140,
    },
  ];
}
