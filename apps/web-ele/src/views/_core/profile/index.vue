<script setup lang="ts">
/**
 * 个人中心页（vben 上游模板结构）：四个 Tab 均为静态展示页，
 * 仅「基本设置」在 onMounted 拉取 /user/info 回显；修改密码等
 * 写操作未接后端，接入时后端需提供相应端点。
 */
import { ref } from 'vue';

import { Profile } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import ProfileBase from './base-setting.vue';
import ProfileNotificationSetting from './notification-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';
import ProfileSecuritySetting from './security-setting.vue';

const userStore = useUserStore();

const tabsValue = ref<string>('basic');

const tabs = ref([
  {
    label: '基本设置',
    value: 'basic',
  },
  {
    label: '安全设置',
    value: 'security',
  },
  {
    label: '修改密码',
    value: 'password',
  },
  {
    label: '新消息提醒',
    value: 'notice',
  },
]);
</script>
<template>
  <Profile
    v-model:model-value="tabsValue"
    title="个人中心"
    :user-info="userStore.userInfo"
    :tabs="tabs"
  >
    <template #content>
      <ProfileBase v-if="tabsValue === 'basic'" />
      <ProfileSecuritySetting v-if="tabsValue === 'security'" />
      <ProfilePasswordSetting v-if="tabsValue === 'password'" />
      <ProfileNotificationSetting v-if="tabsValue === 'notice'" />
    </template>
  </Profile>
</template>
