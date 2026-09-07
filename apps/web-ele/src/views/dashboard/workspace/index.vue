<script lang="ts" setup>
/**
 * 工作台主页（前端自有静态路由，不依赖后端菜单下发，
 * 见 router/routes/modules/dashboard.ts；访问仍走登录守卫）。
 */
import { WorkbenchHeader } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

const userStore = useUserStore();
</script>

<template>
  <div class="p-5">
    <WorkbenchHeader
      :avatar="userStore.userInfo?.avatar || preferences.app.defaultAvatar"
    >
      <template #title>
        早安, {{ userStore.userInfo?.realName }}, 开始您一天的工作吧！
      </template>
      <template #description> </template>
    </WorkbenchHeader>
  </div>
</template>
