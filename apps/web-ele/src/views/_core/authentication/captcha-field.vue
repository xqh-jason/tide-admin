<script lang="ts" setup>
import { computed, useAttrs } from 'vue';

import { $t } from '@vben/locales';

/**
 * 图形验证码表单控件：左侧输入框 + 右侧验证码图（点击刷新）。
 * 作为登录表单 schema 的自定义组件使用，值走 modelValue 与表单双向绑定。
 */
defineOptions({ name: 'CaptchaField' });

const props = defineProps<{
  class?: unknown;
  disabled?: boolean;
  /** 完整的 img src（data:image/png;base64,...） */
  image?: string;
  modelValue?: string;
}>();

const emit = defineEmits<{
  refresh: [];
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();

const value = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
});
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <input
      v-bind="attrs"
      v-model="value"
      :class="
        props.class ??
        'border-input bg-background placeholder:text-muted-foreground/50 flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
      "
      :disabled="disabled"
      :placeholder="$t('authentication.captchaTip')"
      autocomplete="off"
      maxlength="4"
    />
    <img
      v-if="image"
      :alt="$t('authentication.captcha')"
      :src="image"
      :title="$t('authentication.captchaRefresh')"
      class="border-input h-10 w-24 shrink-0 cursor-pointer rounded-md border object-cover"
      @click="emit('refresh')"
    />
    <div
      v-else
      class="border-input bg-background h-10 w-24 shrink-0 animate-pulse cursor-pointer rounded-md border"
      :title="$t('authentication.captchaRefresh')"
      @click="emit('refresh')"
    ></div>
  </div>
</template>
