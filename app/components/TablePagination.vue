<script setup lang="ts">
const page = defineModel<number>("page", { default: 0 });
const props = defineProps<{ pageSize: number; total: number }>();

const from = computed(() =>
  props.total === 0 ? 0 : page.value * props.pageSize + 1,
);
const to = computed(() =>
  Math.min((page.value + 1) * props.pageSize, props.total),
);
const canPrev = computed(() => page.value > 0);
const canNext = computed(() => to.value < props.total);
</script>

<template>
  <div class="flex items-center justify-between pt-4 text-sm text-muted-foreground">
    <span>{{ from }}–{{ to }} of {{ total }}</span>
    <div class="flex gap-2">
      <Button variant="outline" size="sm" :disabled="!canPrev" @click="page--">
        Previous
      </Button>
      <Button variant="outline" size="sm" :disabled="!canNext" @click="page++">
        Next
      </Button>
    </div>
  </div>
</template>
