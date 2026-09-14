<script setup lang="ts">
import type { ActionItem } from './types';

import { computed, ref } from 'vue';

import { cn } from '@vben-core/shared/utils';

import { Popover, PopoverContent, PopoverTrigger } from '../../ui';
import { VbenButton } from '../button';
import { VbenIcon } from '../icon';

const props = defineProps<{ action: ActionItem }>();

const open = ref(false);

/**
 * 提交重入锁：确认回调执行期间按钮置 loading 并忽略重复确认，防止连点重复提交。
 * 约定页面 action 的 popConfirm.confirm 返回 Promise（内部 await 实际请求）。
 */
const submitting = ref(false);

const buttonClass = computed(() =>
  cn(
    'gap-1',
    props.action.danger && 'text-destructive hover:text-destructive',
    props.action.class,
  ),
);

const variant = computed(() => props.action.variant ?? 'link');
const size = computed(() => props.action.size ?? 'default');

function onClick() {
  if (props.action.disabled || props.action.loading) return;
  props.action.onClick?.();
}

async function onConfirm() {
  if (submitting.value) return;
  const pc = props.action.popConfirm;
  open.value = false;
  submitting.value = true;
  try {
    await (pc?.confirm ? pc.confirm() : props.action.onClick?.());
  } catch {
    // 失败提示由 request 拦截器统一处理，这里只负责结束提交态
  } finally {
    submitting.value = false;
  }
}

function onCancel() {
  open.value = false;
}
</script>

<template>
  <!-- 气泡确认 -->
  <Popover v-if="action.popConfirm" v-model:open="open">
    <PopoverTrigger as-child>
      <VbenButton
        :class="buttonClass"
        :disabled="action.disabled || submitting"
        :loading="action.loading || submitting"
        :size="size"
        class="p-2"
        :variant="variant"
      >
        <VbenIcon :icon="action.icon" v-if="action.icon" class="size-4" />
        <span v-if="action.text">{{ action.text }}</span>
      </VbenButton>
    </PopoverTrigger>
    <PopoverContent class="z-popup w-60" side="top">
      <div class="text-foreground mb-3 text-sm">
        {{ action.popConfirm.title ?? 'Are you sure?' }}
      </div>
      <div class="flex justify-end gap-2">
        <VbenButton size="default" variant="outline" @click="onCancel">
          {{ action.popConfirm.cancelText ?? 'Cancel' }}
        </VbenButton>
        <VbenButton
          :variant="action.danger ? 'destructive' : 'default'"
          size="default"
          class="p-2"
          @click="onConfirm"
        >
          {{ action.popConfirm.okText ?? 'OK' }}
        </VbenButton>
      </div>
    </PopoverContent>
  </Popover>

  <!-- 普通按钮 -->
  <VbenButton
    v-else
    :class="buttonClass"
    :disabled="action.disabled"
    :loading="action.loading"
    :size="size"
    class="p-2"
    :variant="variant"
    @click="onClick"
  >
    <VbenIcon :icon="action.icon" v-if="action.icon" class="size-4" />
    <span v-if="action.text">{{ action.text }}</span>
  </VbenButton>
</template>
