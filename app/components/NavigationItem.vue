<script setup lang="ts">
const props = defineProps<{
  title: string;
  icon: string;
  path: string;
  reduce?: boolean;
}>();

const route = useRoute();

const isActive = computed(() => route.path === props.path);
</script>

<template>
  <NuxtLink
    class="flex items-center h-12 mt-2 rounded hover:bg-gray-700 hover:text-gray-300"
    :class="[
      reduce ? 'justify-center w-12' : 'relative w-full px-3',
      isActive ? 'bg-gray-700' : '',
    ]"
    :to="path"
  >
    <o-icon class="w-6 h-6" :icon="icon" />
    <span v-if="!reduce" class="ml-2 text-sm font-medium">
      {{ title }}
    </span>
  </NuxtLink>
</template>
