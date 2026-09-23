import { $t } from '#/locales';

/**
 * 时长展示（HR 各页共用）：后端时长字段一律是「分钟」整数
 * （`duration_minutes` / `min_unit_minutes` / 额度账本的 `delta` 等）。
 */

/** 分钟数 → 本地化时长文案（510 → 「8 小时 30 分钟」；负数前置减号，如额度流水 -120） */
export function formatMinutes(value: null | number | undefined) {
  const total = Math.trunc(value ?? 0);
  const hours = Math.trunc(Math.abs(total) / 60);
  const minutes = Math.abs(total) % 60;
  const text =
    hours > 0
      ? $t('hr.common.durationHoursMinutes', [hours, minutes])
      : $t('hr.common.durationMinutes', [minutes]);
  return total < 0 ? `-${text}` : text;
}
