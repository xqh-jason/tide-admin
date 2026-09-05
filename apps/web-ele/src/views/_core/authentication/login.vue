<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { generateCaptchaApi } from '#/api';
import { useAuthStore } from '#/store';

import CaptchaField from './captcha-field.vue';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const loginRef = ref<InstanceType<typeof AuthenticationLogin>>();

const captchaId = ref('');
const captchaImage = ref('');

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: CaptchaField,
      componentProps: {
        image: captchaImage.value,
        onRefresh: refreshCaptcha,
      },
      fieldName: 'captcha_value',
      label: $t('authentication.captcha'),
      rules: z
        .string()
        .regex(/^\d{4}$/, { message: $t('authentication.captchaTip') }),
    },
  ];
});

/** 重新生成验证码；图一换，旧输入即失效，故一并清空 */
async function refreshCaptcha() {
  const { captcha_id, image } = await generateCaptchaApi();
  captchaId.value = captcha_id;
  captchaImage.value = `data:image/png;base64,${image}`;
  await loginRef.value?.getFormApi().setFieldValue('captcha_value', '');
}

/**
 * 验证码一次性消费，登录失败后必须换新 id 才能再次提交
 */
async function handleLogin(values: Recordable<any>) {
  try {
    await authStore.authLogin({
      captcha_id: captchaId.value,
      captcha_value: values.captcha_value,
      password: values.password,
      username: values.username,
    });
  } catch {
    // 生成失败（如后端短暂不可用）时保留旧图，避免二次抛错
    await refreshCaptcha().catch(() => {});
  }
}

onMounted(refreshCaptcha);
</script>

<template>
  <AuthenticationLogin
    ref="loginRef"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="handleLogin"
  />
</template>
