import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemDeptApi } from '#/api';

import { getDeptList } from '#/api';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/** 同级互看选项（1 开启 / 0 关闭，对齐 sys_dept.allowPeerRead） */
export function getPeerReadOptions() {
  return [
    { label: $t('system.dept.peerReadOn'), type: 'primary', value: 1 },
    { label: $t('system.dept.peerReadOff'), type: 'info', value: 0 },
  ];
}

/**
 * 新增/编辑部门表单 schema
 * 契约：parentId=0 表示根部门；部门名 ≤64 字符同父唯一、备注 ≤255 字符；
 * status 取值域来自数据字典
 */
export function useFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'ApiTreeSelect',
      componentProps: {
        api: async () => {
          const tree = await getDeptList();
          return [{ deptName: $t('system.dept.rootDept'), id: 0 }, ...tree];
        },
        checkStrictly: true,
        defaultExpandAll: true,
        labelField: 'deptName',
        valueField: 'id',
      },
      defaultValue: 0,
      fieldName: 'parentId',
      label: $t('system.dept.parent'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'deptName',
      label: $t('system.dept.deptName'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      defaultValue: 0,
      fieldName: 'sort',
      label: $t('system.dept.sort'),
    },
    {
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
      },
      defaultValue: 0,
      fieldName: 'allowPeerRead',
      label: $t('system.dept.allowPeerRead'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: statusOptions,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.dept.status'),
      rules: 'selectRequired',
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 255, rows: 3 },
      fieldName: 'remark',
      label: $t('system.dept.remark'),
    },
  ];
}

/**
 * 搜索表单 schema：后端 /dept/list 不提供任何过滤参数，
 * keyword/status 由页面拉到树后在前端过滤（见 filterDeptTree）
 */
export function useGridFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.dept.keywordTip'),
      },
      fieldName: 'keyword',
      label: $t('system.dept.deptName'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.dept.status'),
    },
  ];
}

/** 列表列配置（树表：部门名列为层级列，审计列复用公共 useAuditColumns） */
export function useColumns(
  onActionClick: OnActionClickFn<SystemDeptApi.SystemDept>,
): VxeTableGridColumns<SystemDeptApi.SystemDept> {
  const statusOptions = useDictOptions('status');
  return [
    {
      align: 'left',
      field: 'deptName',
      fixed: 'left',
      minWidth: 200,
      title: $t('system.dept.deptName'),
      treeNode: true,
    },
    { field: 'sort', title: $t('system.dept.sort'), width: 70 },
    {
      cellRender: { name: 'CellTag', options: getPeerReadOptions() },
      field: 'allowPeerRead',
      title: $t('system.dept.allowPeerRead'),
      width: 100,
    },
    {
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: $t('system.dept.status'),
      width: 90,
    },
    {
      align: 'left',
      field: 'remark',
      minWidth: 160,
      title: $t('system.dept.remark'),
    },
    {
      // 负责人列表（is_leader=1 的用户名，可兼管多个），后端批量拼装
      field: 'leaders',
      formatter: ({ cellValue }) =>
        ((cellValue ?? []) as SystemDeptApi.DeptLeader[])
          .map((leader) => leader.userName)
          .join('、'),
      minWidth: 140,
      title: $t('system.dept.leaders'),
    },
    ...useAuditColumns<SystemDeptApi.SystemDept>(),
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'deptName',
          nameTitle: $t('system.dept.deptName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            auth: 'system:dept:create',
            code: 'append',
            text: $t('system.dept.append'),
          },
          { auth: 'system:dept:update', code: 'edit' },
          {
            auth: 'system:dept:delete',
            code: 'delete',
            // 后端删除有子部门或用户挂载的部门时拒绝，确认文案显式提示
            confirmTitle: (row: SystemDeptApi.SystemDept) =>
              $t('system.dept.deleteConfirmTip', [row.deptName]),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('system.dept.operation'),
      width: 200,
    },
  ];
}
