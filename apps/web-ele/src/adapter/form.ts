/**
 * vben 表单适配器：基于 @vben/common-ui 的 setupVbenForm 注册 Element Plus
 * 组件类型映射（见 ./component）与通用校验规则，并统一 re-export zod。
 * 业务侧一律从 '#/adapter/form' 引入 useVbenForm / VbenFormSchema / z。
 */
import type {
  VbenFormProps as FormProps,
  VbenFormSchema as FormSchema,
  FormValues,
} from '@vben/common-ui';

import type { ComponentPropsMap, ComponentType } from './component';

import { setupVbenForm, useVbenForm as useForm, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

/** 全局初始化（应用启动时由 bootstrap 调用一次） */
async function initSetupVbenForm() {
  setupVbenForm<ComponentType>({
    config: {
      modelPropNameMap: {
        Upload: 'fileList',
        CheckboxGroup: 'model-value',
      },
    },
    rules: {
      required: (value, _params, ctx) => {
        if (value === undefined || value === null || value.length === 0) {
          return $t('ui.formRules.required', [ctx.label]);
        }
        return true;
      },
      selectRequired: (value, _params, ctx) => {
        if (value === undefined || value === null) {
          return $t('ui.formRules.selectRequired', [ctx.label]);
        }
        return true;
      },
    },
  });
}

function useVbenForm<
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
>(
  options: FormProps<
    ComponentType,
    ComponentPropsMap,
    TFormValues,
    TSubmitValues
  >,
) {
  return useForm<TFormValues, ComponentType, ComponentPropsMap, TSubmitValues>(
    options,
  );
}

export { initSetupVbenForm, useVbenForm, z };

export type VbenFormSchema<TValues extends FormValues = FormValues> =
  FormSchema<ComponentType, ComponentPropsMap, TValues>;
export type VbenFormProps<
  TFormValues extends FormValues = FormValues,
  TSubmitValues extends FormValues = TFormValues,
> = FormProps<ComponentType, ComponentPropsMap, TFormValues, TSubmitValues>;
