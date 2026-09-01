<script lang="ts" setup>
import { VbenAvatar } from '@vben-core/shadcn-ui';

interface Props {
  avatar?: string;
}

defineOptions({
  name: 'WorkbenchHeader',
});

withDefaults(defineProps<Props>(), {
  avatar: '',
});
</script>
<template>
  <div class="card-box p-4 py-6 lg:flex">
    <VbenAvatar v-if="avatar" :src="avatar" class="size-20" />
    <div
      v-if="$slots.title || $slots.description"
      class="flex flex-col justify-center md:mt-0 md:ml-6"
    >
      <h1 v-if="$slots.title" class="text-md font-semibold md:text-xl">
        <slot name="title"></slot>
      </h1>
      <span v-if="$slots.description" class="mt-1 text-foreground/80">
        <slot name="description"></slot>
      </span>
    </div>
  </div>
</template>
