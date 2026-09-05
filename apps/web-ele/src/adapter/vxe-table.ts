import type { FormValues, TableActionProps } from '@vben/common-ui';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { Recordable } from '@vben/types';

import type { ComponentPropsMap, ComponentType } from './component';

import { defineComponent, h } from 'vue';

import { useAccess } from '@vben/access';
import { VbenTableAction as VbenTableActionCore } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $te } from '@vben/locales';
import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';
import { formatDateTime, get, isFunction, isString } from '@vben/utils';

import { objectOmit } from '@vueuse/core';
import { ElButton, ElImage, ElPopconfirm, ElSwitch, ElTag } from 'element-plus';

import { $t } from '#/locales';
import { useDictOptions } from '#/store';

import { useVbenForm } from './form';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: true,
        columnConfig: {
          resizable: true,
        },
        minHeight: 180,
        formConfig: {
          // 全局禁用vxe-table的表单配置，使用formOptions
          enabled: false,
        },
        proxyConfig: {
          autoLoad: true,
          response: {
            result: 'items',
            total: 'total',
            list: 'items',
          },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
      } as VxeTableGridOptions,
    });

    // 解决 vxe-table 热更新时 renderer 重复注册报错的问题
    vxeUI.renderer.forEach((_item, key) => {
      if (key.startsWith('Cell')) {
        vxeUI.renderer.delete(key);
      }
    });

    // 表格配置项可以用 cellRender: { name: 'CellImage' },
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        const src = row[column.field];
        return h(ElImage, { src, previewSrcList: [src], ...props });
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellLink' },
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          ElButton,
          { link: true, size: 'small', type: 'primary' },
          { default: () => props?.text },
        );
      },
    });

    // 单元格渲染： ElTag，options 形如 [{ label, value, type }]
    // 未传 options 时按 status 字典渲染
    vxeUI.renderer.add('CellTag', {
      renderTableDefault({ options, props }, { column, row }) {
        const value = get(row, column.field);
        const tagOptions = options ?? useDictOptions('status');
        const tagItem = tagOptions.find((item) => item.value === value);
        return h(
          ElTag,
          { ...props, ...objectOmit(tagItem ?? {}, ['label', 'value']) },
          { default: () => tagItem?.label ?? value },
        );
      },
    });

    // 单元格渲染： ElSwitch，attrs.beforeChange(newVal, row) 返回 false 可中止变更
    vxeUI.renderer.add('CellSwitch', {
      renderTableDefault({ attrs, props }, { column, row }) {
        const loadingKey = `__loading_${column.field}`;
        const finallyProps = {
          activeText: $t('common.enabled'),
          activeValue: 1,
          inactiveText: $t('common.disabled'),
          inactiveValue: 0,
          inlinePrompt: true,
          ...props,
          modelValue: row[column.field],
          loading: row[loadingKey] ?? false,
          'onUpdate:modelValue': onChange,
        };
        async function onChange(newVal: any) {
          row[loadingKey] = true;
          try {
            const result = await attrs?.beforeChange?.(newVal, row);
            if (result !== false) {
              row[column.field] = newVal;
            }
          } finally {
            row[loadingKey] = false;
          }
        }
        return h(ElSwitch, finallyProps);
      },
    });

    // 单元格渲染：操作按钮组，options 为 ['edit', 'detail', 'delete'] 或自定义项
    vxeUI.renderer.add('CellOperation', {
      renderTableDefault({ attrs, options }, { column, row }) {
        let justify: string;
        switch (column.align) {
          case 'center': {
            justify = 'center';
            break;
          }
          case 'left': {
            justify = 'flex-start';
            break;
          }
          default: {
            justify = 'flex-end';
            break;
          }
        }
        const presets: Recordable<Recordable<any>> = {
          delete: {
            danger: true,
            text: $t('common.delete'),
          },
          edit: {
            text: $t('common.edit'),
          },
          detail: {
            text: $t('common.detail'),
          },
        };
        const operations: Array<Recordable<any>> = (
          options || ['edit', 'detail', 'delete']
        )
          .map((opt) => {
            if (isString(opt)) {
              return presets[opt]
                ? { code: opt, ...presets[opt] }
                : {
                    code: opt,
                    text: $te(`common.${opt}`) ? $t(`common.${opt}`) : opt,
                  };
            }
            return { ...presets[opt.code], ...opt };
          })
          .map((opt) => {
            const optBtn: Recordable<any> = {};
            Object.keys(opt).forEach((key) => {
              optBtn[key] = isFunction(opt[key]) ? opt[key](row) : opt[key];
            });
            return optBtn;
          })
          .filter((opt) => opt.show !== false);

        function renderBtn(opt: Recordable<any>, listen = true) {
          return h(
            ElButton,
            {
              ...opt,
              danger: undefined,
              icon: undefined,
              link: true,
              size: 'small',
              text: undefined,
              type: opt.danger ? 'danger' : 'primary',
              onClick: listen
                ? () => attrs?.onClick?.({ code: opt.code, row })
                : undefined,
            },
            {
              default: () => {
                const content = [];
                if (opt.icon) {
                  content.push(
                    h(IconifyIcon, { class: 'size-5', icon: opt.icon }),
                  );
                }
                content.push(opt.text);
                return content;
              },
            },
          );
        }

        function renderConfirm(opt: Recordable<any>) {
          return h(
            ElPopconfirm,
            {
              cancelButtonText: $t('common.cancel'),
              confirmButtonText: $t('common.confirm'),
              placement: 'top',
              title: $t('ui.actionMessage.deleteConfirm', [
                row[attrs?.nameField || 'name'],
              ]),
              width: 220,
              onConfirm: () => {
                attrs?.onClick?.({ code: opt.code, row });
              },
            },
            {
              reference: () => renderBtn({ ...opt }, false),
            },
          );
        }

        const btns = operations.map((opt) =>
          opt.code === 'delete' ? renderConfirm(opt) : renderBtn(opt),
        );
        return h(
          'div',
          {
            class: 'flex table-operations w-full',
            style: { justifyContent: justify },
          },
          btns,
        );
      },
    });

    // 全局时间格式化，列上用 formatter: 'formatDateTime' 引用
    vxeUI.formats.add('formatDateTime', ({ cellValue }) =>
      cellValue ? formatDateTime(cellValue) : '-',
    );
  },
  useVbenForm,
});

export const useVbenVxeGrid = <
  T extends Record<string, any>,
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
>(
  ...rest: Parameters<
    typeof useGrid<
      T,
      ComponentType,
      ComponentPropsMap,
      TFormValues,
      TSubmitValues
    >
  >
) =>
  useGrid<T, ComponentType, ComponentPropsMap, TFormValues, TSubmitValues>(
    ...rest,
  );

/**
 * 表格操作按钮组件
 *
 * 在适配器内部统一注入权限判断（hasPermission），使用方无需再传入 `:has-permission`。
 * 通过 action 的 `auth` 字段声明权限码，结合 `useAccess().hasAccessByCodes` 判断是否展示。
 * 如需自定义权限逻辑，仍可显式传入 `:has-permission` 覆盖默认行为。
 */
export const VbenTableAction = defineComponent(
  (props: TableActionProps, { attrs, slots }) => {
    const { hasAccessByCodes } = useAccess();
    function hasPermission(auth?: string | string[]) {
      if (!auth) return true;
      return hasAccessByCodes(Array.isArray(auth) ? auth : [auth]);
    }
    return () =>
      h(VbenTableActionCore, { hasPermission, ...props, ...attrs }, slots);
  },
  {
    name: 'VbenTableAction',
    inheritAttrs: false,
  },
);

export type OnActionClickParams<T = Recordable<any>> = {
  code: string;
  row: T;
};
export type OnActionClickFn<T = Recordable<any>> = (
  params: OnActionClickParams<T>,
) => void;
export type * from '@vben/plugins/vxe-table';
