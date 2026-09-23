import type { DictOption } from '#/store';

/**
 * 在选项集合中按值取项（`CellTag` / `ElTag` / `ElTimelineItem` 的标签与颜色渲染用）。
 * 未命中返回 undefined，调用方回退展示原始值——避免各页各写一份 `options.find(...)`。
 */
export function findOption(options: DictOption[], value: unknown) {
  return options.find((item) => item.value === value);
}
