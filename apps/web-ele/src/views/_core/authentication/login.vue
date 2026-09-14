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
      fieldName: 'captchaValue',
      label: $t('authentication.captcha'),
      // 4 位定长输入：失焦/提交时才校验，避免每敲一位数字
      // 就触发一次「请输入 4 位图形验证码」
      formFieldProps: { validateOn: ['blur'] },
      rules: z
        .string()
        .regex(/^\d{4}$/, { message: $t('authentication.captchaTip') }),
    },
  ];
});

/** 重新生成验证码；图一换，旧输入即失效，故一并清空 */
async function refreshCaptcha() {
  const { captchaId: id, image } = await generateCaptchaApi();
  captchaId.value = id;
  captchaImage.value = `data:image/png;base64,${image}`;
  await loginRef.value?.getFormApi().setFieldValue('captchaValue', '');
}

/**
 * 验证码一次性消费，登录失败后必须换新 id 才能再次提交
 */
async function handleLogin(values: Recordable<any>) {
  try {
    await authStore.authLogin({
      captchaId: captchaId.value,
      captchaValue: values.captchaValue,
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
  <!--
    AuthenticationLogin 的这些入口默认全是 true，后端只实现了
    /auth/login（账号密码 + 图形验证码），手机号登录、扫码登录、注册、
    找回密码、第三方登录都会跳到没有后端支撑的页面，故全部关掉。
    后续真正实现了对应流程，把相应的 prop 去掉即可恢复入口。
  -->
  <AuthenticationLogin
    ref="loginRef"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-third-party-login="false"
    @submit="handleLogin"
  />
</template>
