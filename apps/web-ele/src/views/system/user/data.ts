import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type {
  SystemDeptApi,
  SystemPositionApi,
  SystemRoleApi,
  SystemUserApi,
} from '#/api';

import { z } from '#/adapter/form';
import {
  flattenDeptTree,
  getAllPositions,
  getAllRoles,
  getDeptList,
} from '#/api';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/** 部门选择器共享缓存：部门树选择器与主部门/负责人选项共用同一份数据源 */
let deptTreeCache: SystemDeptApi.SystemDept[] = [];
let deptTreePending: Promise<void> | undefined;

/**
 * 拉取最新部门树写入缓存（并发调用去重）。
 * 部门树选择器（ApiTreeSelect）与表单回填（setValues 前）都会调用，
 * 保证主部门/负责人选项与树数据一致
 */
export function refreshDeptTreeCache(): Promise<void> {
  deptTreePending ??= getDeptList()
    .then((tree) => {
      deptTreeCache = tree;
    })
    .finally(() => {
      deptTreePending = undefined;
    });
  return deptTreePending;
}

/**
 * 按已选部门 id 过滤出下拉选项（须在 refreshDeptTreeCache 完成后调用）；
 * 停用部门保留可选但加后缀标注（历史挂载需可见回显）
 */
function getDeptOptionsByIds(ids?: number[]) {
  const idSet = new Set(ids);
  return flattenDeptTree(deptTreeCache)
    .filter((dept) => idSet.has(dept.id))
    .map((dept) => ({
      label:
        dept.status === 0
          ? `${dept.deptName}${$t('system.user.deptDisabledMark')}`
          : dept.deptName,
      value: dept.id,
    }));
}

/** getEditId：编辑态返回用户 id，密码可选；创建态密码必填 */
export function useFormSchema(getEditId: () => number): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
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
    {
      component: 'ApiTreeSelect',
      componentProps: {
        // refreshDeptTreeCache 并发去重，与表单回填共享同一份数据
        api: async () => {
          await refreshDeptTreeCache();
          return deptTreeCache;
        },
        checkStrictly: true,
        defaultExpandAll: true,
        labelField: 'deptName',
        multiple: true,
        valueField: 'id',
      },
      fieldName: 'deptIds',
      label: $t('system.user.depts'),
    },
    {
      component: 'Select',
      // 主部门 = 已选部门中的一项；depts 非空时后端要求恰好一个 isPrimary=1，
      // 选项与校验规则均随 deptIds 联动（含从树中取消勾选后的悬挂值）
      dependencies: {
        componentProps: (values) => ({
          clearable: true,
          options: getDeptOptionsByIds(values.deptIds as number[] | undefined),
        }),
        rules: (values) => {
          const deptIds = (values.deptIds as number[] | undefined) ?? [];
          if (deptIds.length === 0) return null;
          const primary = values.primaryDeptId;
          return primary === undefined ||
            primary === null ||
            !deptIds.includes(primary)
            ? 'selectRequired'
            : null;
        },
        triggerFields: ['deptIds', 'primaryDeptId'],
      },
      fieldName: 'primaryDeptId',
      label: $t('system.user.primaryDept'),
    },
    {
      component: 'Select',
      // 负责人部门 = 已选部门的子集（isLeader 可多个）；提交前按 deptIds 收敛
      dependencies: {
        componentProps: (values) => ({
          clearable: true,
          multiple: true,
          options: getDeptOptionsByIds(values.deptIds as number[] | undefined),
        }),
        triggerFields: ['deptIds'],
      },
      fieldName: 'leaderDeptIds',
      label: $t('system.user.leaderDepts'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: SystemPositionApi.Position[]) =>
          items.map((position) => ({
            // list 返回含禁用职位（历史挂载需可见回显），标注以便辨识
            label:
              position.status === 0
                ? `${position.positionName}${$t('system.user.positionDisabledMark')}`
                : position.positionName,
            value: position.id,
          })),
        api: getAllPositions,
        multiple: true,
      },
      fieldName: 'positionIds',
      label: $t('system.user.positions'),
    },
  ];
}

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
    {
      // 所属部门：后端 /user/list 回填 depts（含部门名），主部门加标注
      field: 'depts',
      formatter: ({ cellValue }) =>
        ((cellValue ?? []) as SystemUserApi.UserDeptItem[])
          .map((dept) =>
            dept.isPrimary === 1
              ? `${dept.deptName}${$t('system.user.primaryDeptMark')}`
              : dept.deptName,
          )
          .join('、'),
      minWidth: 180,
      title: $t('system.user.depts'),
    },
    {
      // 所属职位：后端 /user/list 回填 positions（含职位名），纯展示无主次
      field: 'positions',
      formatter: ({ cellValue }) =>
        ((cellValue ?? []) as SystemUserApi.UserPositionItem[])
          .map((position) => position.positionName)
          .filter(Boolean)
          .join('、'),
      minWidth: 140,
      title: $t('system.user.positions'),
    },
    { field: 'email', minWidth: 180, title: $t('system.user.email') },
    { field: 'phone', title: $t('system.user.phone'), width: 140 },
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
