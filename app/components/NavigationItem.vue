<script setup lang="ts">
import type { Component } from "vue";

const props = defineProps<{
  title: string;
  icon: Component;
  path: string;
  reduce?: boolean;
}>();

const route = useRoute();

const isActive = computed(() => route.path === props.path);
</script>

<template>
  <NuxtLink
    class="flex items-center h-12 mt-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    :class="[
      reduce ? 'justify-center w-12' : 'relative w-full px-3',
      isActive ? 'bg-sidebar-accent text-sidebar-primary' : '',
    ]"
    :to="path"
  >
    <component :is="icon" class="size-5" />
    <span v-if="!reduce" class="ml-2 text-sm font-medium">
      {{ title }}
    </span>
  </NuxtLink>
</template>
