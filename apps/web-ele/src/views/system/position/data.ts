import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemPositionApi } from '#/api';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useAuditColumns } from '../audit-columns';

/**
 * 职位新增/编辑表单 schema：后端全字段必填（CreatePositionReq/UpdatePositionReq），
 * 编码/名称长度对齐列定义 VARCHAR(64)，备注 VARCHAR(255)
 */
export function useFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        placeholder: $t('system.position.positionCodeTip'),
      },
      fieldName: 'positionCode',
      label: $t('system.position.positionCode'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
      },
      fieldName: 'positionName',
      label: $t('system.position.positionName'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      defaultValue: 0,
      fieldName: 'sort',
      label: $t('system.position.sort'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        isButton: true,
        options: statusOptions,
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.position.status'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 255,
        rows: 3,
        showWordLimit: true,
      },
      fieldName: 'remark',
      label: $t('system.position.remark'),
    },
  ];
}

/** 职位搜索表单 schema：关键字（编码/名称模糊）+ 状态，与 PositionListReq 对应 */
export function useGridFormSchema(): VbenFormSchema[] {
  const statusOptions = useDictOptions('status');
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.position.keywordTip'),
      },
      fieldName: 'keyword',
      label: $t('system.position.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        options: statusOptions,
      },
      fieldName: 'status',
      label: $t('system.position.status'),
    },
  ];
}

/**
 * 职位列表列配置：审计列复用公共 useAuditColumns；
 * status 为只读标签（职位无独立启停端点，状态经编辑表单全量提交变更）
 */
export function useColumns(
  onActionClick?: OnActionClickFn<SystemPositionApi.Position>,
): VxeTableGridColumns<SystemPositionApi.Position> {
  const statusOptions = useDictOptions('status');
  return [
    {
      field: 'positionCode',
      title: $t('system.position.positionCode'),
      width: 140,
    },
    {
      field: 'positionName',
      title: $t('system.position.positionName'),
      width: 140,
    },
    { field: 'sort', title: $t('system.position.sort'), width: 90 },
    {
      cellRender: { name: 'CellTag', options: statusOptions },
      field: 'status',
      title: $t('system.position.status'),
      width: 100,
    },
    {
      field: 'remark',
      minWidth: 160,
      showOverflow: true,
      title: $t('system.position.remark'),
    },
    ...useAuditColumns<SystemPositionApi.Position>(),
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'positionName',
          nameTitle: $t('system.position.positionName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { auth: 'system:position:update', code: 'edit' },
          {
            auth: 'system:position:delete',
            code: 'delete',
            // 后端删除已被用户挂载的职位时拒绝，确认文案显式提示
            confirmTitle: (row: SystemPositionApi.Position) =>
              $t('system.position.deleteConfirmTip', [row.positionName]),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      title: $t('system.position.operation'),
      width: 140,
    },
  ];
}
