import type { HrEmployeeApi } from '#/api';
import type { DictOption } from '#/store';

import { useUserStore } from '@vben/stores';

import { getAllEmployeesApi } from '#/api';
import { $t } from '#/locales';

/**
 * 员工选择器公共件（HR 各页共用：请假 / 加班 / 排班 / 额度发放 / 额度查询等）。
 * 后端没有「员工 list-all」端点，统一走 `/hr/employee/list` 取满一页（上限 1000 条）。
 */

/** 员工 → 下拉选项：label 取关联账号显示名，无账号档案回退「档案 #id」 */
export function employeeSelectOptions(items: HrEmployeeApi.Employee[]) {
  return items.map((item) => ({
    label: item.userName || `#${item.id}`,
    value: item.id,
  }));
}

/** 员工下拉（ApiSelect）通用 componentProps；`multiple` 等差异由调用方覆盖 */
export function useEmployeeSelectProps(placeholder?: string) {
  return {
    afterFetch: employeeSelectOptions,
    api: getAllEmployeesApi,
    clearable: true,
    filterable: true,
    placeholder,
  };
}

/**
 * 当前登录账号关联的员工档案。
 * 后端无「按用户查档案」端点，退化为分页扫全表匹配 `userId`（每页 1000，最多 10 页）；
 * 请假单 / 加班单的写入口要求单据归属 = 本人的档案，未关联档案时返回 null，
 * 由调用方提示「当前账号未关联员工档案」。
 */
export async function resolveMyEmployee(): Promise<HrEmployeeApi.Employee | null> {
  const userId = Number(useUserStore().userInfo?.userId ?? 0);
  if (!userId) return null;
  const employees = await getAllEmployeesApi();
  return employees.find((item) => item.userId === userId) ?? null;
}

/** 状态标签选项：后端 status 字典（1 启用 / 0 停用） */
export function enabledStatusOptions(): DictOption[] {
  return [
    { label: $t('common.enabled'), type: 'success', value: 1 },
    { label: $t('common.disabled'), type: 'info', value: 0 },
  ];
}
