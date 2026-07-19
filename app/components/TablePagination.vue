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

// If the total shrinks (refresh, deletions), don't strand the user on a page
// past the end.
watch(
  () => props.total,
  (total) => {
    const maxPage = Math.max(0, Math.ceil(total / props.pageSize) - 1);
    if (page.value > maxPage) page.value = maxPage;
  },
);
</script>

<template>
  <div class="flex items-center justify-between pt-4 text-sm text-muted-foreground">
    <span>{{ $t("common.range", { from, to, total }) }}</span>
    <div class="flex gap-2">
      <Button variant="outline" size="sm" :disabled="!canPrev" @click="page--">
        {{ $t("common.previous") }}
      </Button>
      <Button variant="outline" size="sm" :disabled="!canNext" @click="page++">
        {{ $t("common.next") }}
      </Button>
    </div>
  </div>
</template>
