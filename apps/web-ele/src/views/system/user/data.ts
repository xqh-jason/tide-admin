import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemRoleApi, SystemUserApi } from '#/api';

import { z } from '#/adapter/form';
import { getAllRoles } from '#/api';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/**
 * 新增/编辑用户表单 schema
 * @param getEditId 编辑态返回用户 id，密码可选；创建态密码必填
 */
export function useFormSchema(getEditId: () => number): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        // 禁止浏览器用登录页保存的账号自动填充「新增用户」的用户名
        autocomplete: 'off',
      },
      fieldName: 'username',
      label: $t('system.user.username'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'empNo',
      label: $t('system.user.empNo'),
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
        // new-password 声明这是「新建密码」而非登录密码，
        // 浏览器才不会把保存的登录密码自动填入（autocomplete=off 对密码框会被 Chrome 忽略）
        autocomplete: 'new-password',
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
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.user.status'),
      rules: 'selectRequired',
      defaultValue: 1,
    },
    {
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: SystemRoleApi.SystemRole[]) =>
          items.map((role) => ({
            // list-all 含禁用角色（历史分配需可见回显），标注以便辨识
            label:
              role.status === 0 ? `${role.roleName}（已禁用）` : role.roleName,
            value: role.id,
          })),
        api: () => getAllRoles(),
        multiple: true,
      },
      fieldName: 'roleIds',
      label: $t('system.user.roles'),
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
      label: $t('system.user.username'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.user.status'),
    },
  ];
}

/** 列表列配置：审计列复用公共 useAuditColumns，status 列按传参切换开关/标签 */
export function useColumns(
  onStatusChange?: (
    newVal: number,
    row: SystemUserApi.SystemUser,
  ) => Promise<boolean>,
): VxeTableGridColumns<SystemUserApi.SystemUser> {
  const statusOptions = useDictOptions('status');
  return [
    { field: 'username', title: $t('system.user.username'), width: 140 },
    { field: 'empNo', title: $t('system.user.empNo'), width: 120 },
    { field: 'nickname', title: $t('system.user.nickname'), width: 140 },
    { field: 'email', minWidth: 180, title: $t('system.user.email') },
    {
      // 后端 UserResp 暂不返回 phone（创建/更新请求有该字段），列表中恒为空；
      // 后端补齐后自动展示
      field: 'phone',
      title: $t('system.user.phone'),
      width: 140,
    },
    {
      cellRender: {
        attrs: {
          auth: 'system:user:update',
          beforeChange: onStatusChange,
          // 内置超管 admin 状态不可变更（后端拒绝），不展示开关，只读标签
          show: (row: SystemUserApi.SystemUser) => row.username !== 'admin',
        },
        name: onStatusChange ? 'CellSwitch' : 'CellTag',
        options: statusOptions,
      },
      field: 'status',
      title: $t('system.user.status'),
      width: 100,
    },
    ...useAuditColumns<SystemUserApi.SystemUser>(),
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('system.user.operation'),
      width: 150,
    },
  ];
}
