import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { HrEmployeeApi, SystemRoleApi, SystemUserApi } from '#/api';

import { getAllRoles, getAllUsersApi } from '#/api';
import { $t } from '#/locales';
import { useDictOptions } from '#/store';
import { useAuditColumns } from '#/views/system/audit-columns';

/**
 * 新增/编辑表单 schema。
 *
 * 契约要点（对齐后端 CreateEmployeeReq / UpdateEmployeeReq）：
 * - 创建态账号来源二选一：`accountMode === 'existing'` 提交 `userId`
 *   （远程用户下拉），`'new'` 提交 `createAccount`（同事务建账号）；
 * - 编辑态（`editId > 0`）接口无账号字段，抽屉注入哨兵值 `'none'` 触发依赖重算，
 *   账号来源字段（含二选一单选）因 `show` 判定为 false 而全部隐藏且不参与校验；
 * - `idCard` / `bankAccount` 列表与详情回传的是掩码值，**编辑态不回填**，
 *   留空提交空串即「不修改」，故二者占位提示为留空说明；
 * - 日期字段传 `yyyy-MM-dd` 字符串（DatePicker 的 valueFormat）。
 *
 * getEditId：编辑态返回档案 id（仅用于规则/展示判定，schema 结构保持静态，
 * 与 system/user/data.ts 同款写法）
 */
export function useFormSchema(getEditId: () => number): VbenFormSchema[] {
  const employmentStatusOptions = useDictOptions('employmentStatus');
  const educationOptions = useDictOptions('education');
  // 账号字段仅在创建态可见：accountMode 由抽屉显式赋值（创建态 'existing'，
  // 编辑态哨兵 'none'），账号字段据此判定隐藏（show=false）且不参与校验
  return [
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: [
          { label: $t('hr.employee.accountExisting'), value: 'existing' },
          { label: $t('hr.employee.accountNew'), value: 'new' },
        ],
      },
      dependencies: {
        rules: () => (getEditId() > 0 ? null : 'selectRequired'),
        show: () => getEditId() === 0,
        triggerFields: ['accountMode'],
      },
      fieldName: 'accountMode',
      label: $t('hr.employee.accountMode'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        // 与审计搜索项同一数据源：软删账号后端视为不存在，置灰不可选
        afterFetch: (items: SystemUserApi.UserBrief[]) =>
          items.map((user) => ({
            disabled: user.deleted,
            label: user.username,
            value: user.id,
          })),
        api: getAllUsersApi,
        clearable: true,
        filterable: true,
        placeholder: $t('hr.employee.userIdTip'),
      },
      dependencies: {
        rules: (values) =>
          values.accountMode === 'existing' ? 'selectRequired' : null,
        show: (values) => values.accountMode === 'existing',
        triggerFields: ['accountMode'],
      },
      fieldName: 'userId',
      label: $t('hr.employee.userId'),
    },
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        maxlength: 64,
      },
      dependencies: {
        rules: (values) => (values.accountMode === 'new' ? 'required' : null),
        show: (values) => values.accountMode === 'new',
        triggerFields: ['accountMode'],
      },
      fieldName: 'username',
      label: $t('hr.employee.accountUsername'),
    },
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'new-password',
        maxlength: 128,
        showPassword: true,
      },
      dependencies: {
        rules: (values) => (values.accountMode === 'new' ? 'required' : null),
        show: (values) => values.accountMode === 'new',
        triggerFields: ['accountMode'],
      },
      fieldName: 'password',
      label: $t('hr.employee.accountPassword'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
      },
      dependencies: {
        rules: (values) => (values.accountMode === 'new' ? 'required' : null),
        show: (values) => values.accountMode === 'new',
        triggerFields: ['accountMode'],
      },
      fieldName: 'nickname',
      label: $t('hr.employee.accountNickname'),
    },
    {
      component: 'Input',
      dependencies: {
        show: (values) => values.accountMode === 'new',
        triggerFields: ['accountMode'],
      },
      fieldName: 'empNo',
      label: $t('hr.employee.accountEmpNo'),
    },
    {
      component: 'Input',
      dependencies: {
        show: (values) => values.accountMode === 'new',
        triggerFields: ['accountMode'],
      },
      fieldName: 'phone',
      label: $t('hr.employee.accountPhone'),
    },
    {
      component: 'Input',
      dependencies: {
        show: (values) => values.accountMode === 'new',
        triggerFields: ['accountMode'],
      },
      fieldName: 'email',
      label: $t('hr.employee.accountEmail'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        afterFetch: (items: SystemRoleApi.SystemRole[]) =>
          items.map((role) => ({
            // list-all 含禁用角色（历史分配需可见回显），标注以便辨识
            label:
              role.status === 0
                ? `${role.roleName}${$t('hr.employee.roleDisabledMark')}`
                : role.roleName,
            value: role.id,
          })),
        api: () => getAllRoles(),
        multiple: true,
      },
      dependencies: {
        show: (values) => values.accountMode === 'new',
        triggerFields: ['accountMode'],
      },
      fieldName: 'roleIds',
      label: $t('hr.employee.accountRoles'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: employmentStatusOptions,
      },
      fieldName: 'employmentStatus',
      label: $t('hr.employee.employmentStatus'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        options: educationOptions,
      },
      defaultValue: 0,
      fieldName: 'education',
      label: $t('hr.employee.education'),
      rules: 'selectRequired',
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'hireDate',
      label: $t('hr.employee.hireDate'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'regularDate',
      label: $t('hr.employee.regularDate'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'leaveDate',
      label: $t('hr.employee.leaveDate'),
    },
    {
      component: 'Input',
      componentProps: {
        // 列宽 VARCHAR(128)，与后端校验上限一致
        maxlength: 128,
      },
      fieldName: 'graduateSchool',
      label: $t('hr.employee.graduateSchool'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
      },
      fieldName: 'major',
      label: $t('hr.employee.major'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        placeholder: $t('hr.employee.sensitiveKeepTip'),
      },
      fieldName: 'idCard',
      label: $t('hr.employee.idCard'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
      },
      fieldName: 'emergencyContact',
      label: $t('hr.employee.emergencyContact'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
      },
      fieldName: 'emergencyPhone',
      label: $t('hr.employee.emergencyPhone'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('hr.employee.sensitiveKeepTip'),
      },
      fieldName: 'bankAccount',
      label: $t('hr.employee.bankAccount'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'remark',
      label: $t('hr.employee.remark'),
    },
  ];
}

/** 员工档案搜索表单 schema：关键字（备注/紧急联系人模糊）+ 在职状态 + 学历 */
export function useGridFormSchema(): VbenFormSchema[] {
  const employmentStatusOptions = useDictOptions('employmentStatus');
  const educationOptions = useDictOptions('education');
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('hr.employee.keywordTip'),
      },
      fieldName: 'keyword',
      label: $t('hr.employee.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: employmentStatusOptions,
      },
      fieldName: 'employmentStatus',
      label: $t('hr.employee.employmentStatus'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: educationOptions,
      },
      fieldName: 'education',
      label: $t('hr.employee.education'),
    },
  ];
}

/**
 * 员工档案列表列配置：审计列复用公共 useAuditColumns；
 * 在职状态/学历为字典标签；`idCard` / `bankAccount` 直接展示后端掩码值
 */
export function useColumns(
  onActionClick?: OnActionClickFn<HrEmployeeApi.Employee>,
): VxeTableGridColumns<HrEmployeeApi.Employee> {
  const employmentStatusOptions = useDictOptions('employmentStatus');
  const educationOptions = useDictOptions('education');
  return [
    { field: 'userName', title: $t('hr.employee.userName'), width: 120 },
    {
      cellRender: {
        name: 'CellTag',
        options: employmentStatusOptions,
      },
      field: 'employmentStatus',
      title: $t('hr.employee.employmentStatus'),
      width: 100,
    },
    {
      cellRender: { name: 'CellTag', options: educationOptions },
      field: 'education',
      title: $t('hr.employee.education'),
      width: 100,
    },
    { field: 'hireDate', title: $t('hr.employee.hireDate'), width: 120 },
    { field: 'regularDate', title: $t('hr.employee.regularDate'), width: 120 },
    { field: 'leaveDate', title: $t('hr.employee.leaveDate'), width: 120 },
    {
      field: 'graduateSchool',
      minWidth: 140,
      showOverflow: true,
      title: $t('hr.employee.graduateSchool'),
    },
    {
      field: 'major',
      minWidth: 120,
      showOverflow: true,
      title: $t('hr.employee.major'),
    },
    { field: 'idCard', title: $t('hr.employee.idCard'), width: 180 },
    {
      field: 'emergencyContact',
      title: $t('hr.employee.emergencyContact'),
      width: 120,
    },
    {
      field: 'emergencyPhone',
      title: $t('hr.employee.emergencyPhone'),
      width: 140,
    },
    { field: 'bankAccount', title: $t('hr.employee.bankAccount'), width: 160 },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('hr.employee.remark'),
    },
    ...useAuditColumns<HrEmployeeApi.Employee>(),
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'userName',
          nameTitle: $t('hr.employee.userName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { auth: 'hr:employee:update', code: 'edit' },
          {
            auth: 'hr:employee:delete',
            code: 'delete',
            // 关联登录账号不随档案删除，确认文案显式提示
            confirmTitle: (row: HrEmployeeApi.Employee) =>
              $t('hr.employee.deleteConfirmTip', [row.userName]),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('hr.employee.operation'),
      width: 140,
    },
  ];
}
