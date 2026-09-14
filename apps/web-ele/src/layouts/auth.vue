<script lang="ts" setup>
/**
 * 认证页布局。
 *
 * 品牌标识与插画直接取品牌常量，而不是读 preferences：
 * 偏好设置会整体缓存进 localStorage 且缓存优先级高于默认值，
 * 换品牌后老浏览器仍会渲染旧图，用常量可保证立即生效。
 */
import { computed } from 'vue';

import { AuthPageLayout } from '@vben/layouts';
import { preferences } from '@vben/preferences';

import { BRAND_LOGIN_SLOGAN, BRAND_LOGO, BRAND_LOGO_DARK } from '#/brand';
import { $t } from '#/locales';

const appName = computed(() => preferences.app.name);
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :logo="BRAND_LOGO"
    :logo-dark="BRAND_LOGO_DARK"
    :page-description="$t('authentication.pageDesc')"
    :page-title="$t('authentication.pageTitle')"
    :slogan-image="BRAND_LOGIN_SLOGAN"
  />
</template>
