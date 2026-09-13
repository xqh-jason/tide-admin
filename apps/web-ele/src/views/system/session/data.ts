import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { SystemSessionApi } from '#/api';

import { $t } from '#/locales';

/** 会话状态展示值（前端派生字段，非后端返回；派生规则见 deriveSessionStatus） */
export type SessionStatus = 'expired' | 'offline' | 'online' | 'revoked';

/**
 * 解析后端本地时间字符串（yyyy-MM-dd HH:mm:ss）：补 T 后按浏览器本地时区解析，
 * 与后端 Local 序列化口径一致；仅用于展示层判定，权威判定以后端为准
 */
function parseLocalTime(datetime: string): number {
  return new Date(datetime.replace(' ', 'T')).getTime();
}

/**
 * 派生会话状态：已下线（revokedAt 非空）> 已过期（expiresAt 已过）>
 * 在线（后端按 lastActiveAt 5 分钟窗口给出 online）> 离线
 */
export function deriveSessionStatus(
  row: SystemSessionApi.Session,
): SessionStatus {
  if (row.revokedAt) {
    return 'revoked';
  }
  if (parseLocalTime(row.expiresAt) <= Date.now()) {
    return 'expired';
  }
  return row.online ? 'online' : 'offline';
}

/** 死记录判定（已下线或已过期）：后端仅允许物理删除死记录 */
export function isSessionDead(row: SystemSessionApi.Session): boolean {
  return !!row.revokedAt || parseLocalTime(row.expiresAt) <= Date.now();
}

/** 会话状态选项（CellTag 静态配色；后端无对应字典，与 menu 页 getMenuTypeOptions 同风格） */
export function useSessionStatusOptions() {
  return [
    { label: $t('system.session.online'), type: 'success', value: 'online' },
    { label: $t('system.session.offline'), type: 'info', value: 'offline' },
    { label: $t('system.session.revoked'), type: 'danger', value: 'revoked' },
    { label: $t('system.session.expired'), type: 'warning', value: 'expired' },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('system.session.username'),
    },
    {
      // 后端仅支持 online_only 过滤（RefreshTokenListReq），故只有「在线」一项，
      // 不传查全部；「离线」无法单独筛出
      component: 'Select',
      componentProps: {
        clearable: true,
        options: [{ label: $t('system.session.online'), value: true }],
      },
      fieldName: 'onlineOnly',
      label: $t('system.session.status'),
    },
  ];
}

export function useColumns(): VxeTableGridColumns<SystemSessionApi.Session> {
  return [
    { type: 'checkbox', width: 50 },
    { field: 'username', title: $t('system.session.username'), width: 130 },
    { field: 'ip', title: $t('system.session.ip'), width: 140 },
    {
      field: 'agent',
      minWidth: 200,
      showOverflow: true,
      title: $t('system.session.agent'),
    },
    {
      cellRender: { name: 'CellTag', options: useSessionStatusOptions() },
      // status 为前端派生的展示字段（见 index.vue query 内映射），非后端返回字段
      field: 'status',
      title: $t('system.session.status'),
      width: 90,
    },
    {
      field: 'revokeReason',
      formatter: ({ cellValue }) => cellValue || '-',
      minWidth: 130,
      showOverflow: true,
      title: $t('system.session.revokeReason'),
    },
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      title: $t('system.session.createdAt'),
      width: 170,
    },
    {
      field: 'lastActiveAt',
      formatter: 'formatDateTime',
      title: $t('system.session.lastActiveAt'),
      width: 170,
    },
    {
      field: 'expiresAt',
      formatter: 'formatDateTime',
      title: $t('system.session.expiresAt'),
      width: 170,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      showOverflow: false,
      slots: { default: 'action' },
      title: $t('system.session.operation'),
      width: 150,
    },
  ];
}
