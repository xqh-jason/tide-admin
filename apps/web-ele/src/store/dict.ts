import type { SystemDictionaryApi } from '#/api';

import { reactive } from 'vue';

import { defineStore } from 'pinia';

import { getDictionaryByType } from '#/api';

/** 字典选项：label 展示文案，value 业务值，type 对应 ElTag 颜色（取自字典 extend） */
export interface DictOption {
  label: string;
  type?: string;
  value: number | string;
}

function toOption(
  item: SystemDictionaryApi.DictionaryDetailOption,
): DictOption {
  const option: DictOption = { label: item.label, value: toValue(item.value) };
  if (item.extend) {
    option.type = item.extend;
  }
  return option;
}

/** 后端字典值为字符串，数字串转为数字以匹配后端 i8 字段 */
function toValue(value: string) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

export const useDictStore = defineStore('dict', () => {
  /** 字典类型编码 -> 选项列表，响应式，可直接传给表单/表格的 options */
  const optionsMap = reactive<Record<string, DictOption[]>>({});
  /** 进行中的请求，避免并发重复拉取 */
  const pendingMap = new Map<string, Promise<void>>();

  async function loadOptions(type: string) {
    let pending = pendingMap.get(type);
    if (!pending) {
      pending = getDictionaryByType({ type })
        .then(({ details }) => {
          const list = (optionsMap[type] ??= []);
          list.splice(0, list.length, ...details.map((item) => toOption(item)));
        })
        // 拉取失败保持空选项，由页面按原始值兜底展示
        .catch(() => undefined)
        .finally(() => pendingMap.delete(type));
      pendingMap.set(type, pending);
    }
    return pending;
  }

  /**
   * 取字典选项（响应式数组，加载完成后就地更新）
   * 首次调用会触发加载，无需调用方关心异步
   */
  function getOptions(type: string): DictOption[] {
    let list = optionsMap[type];
    if (!list) {
      list = [];
      optionsMap[type] = list;
      void loadOptions(type);
    }
    return list;
  }

  function $reset() {
    for (const key of Object.keys(optionsMap)) {
      Reflect.deleteProperty(optionsMap, key);
    }
    pendingMap.clear();
  }

  return { $reset, getOptions, loadOptions, optionsMap };
});

/** 便捷入口：取某个字典类型的选项，如 useDictOptions('status') */
export function useDictOptions(type: string) {
  return useDictStore().getOptions(type);
}
