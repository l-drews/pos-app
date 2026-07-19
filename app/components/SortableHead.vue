<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-vue-next";

const props = defineProps<{
  column: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  align?: "left" | "right";
}>();

const emit = defineEmits<{ sort: [column: string] }>();

const active = computed(() => props.sortBy === props.column);
const icon = computed(() =>
  active.value ? (props.sortDir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown,
);
</script>

<template>
  <TableHead>
    <button
      type="button"
      class="inline-flex items-center gap-1 hover:text-foreground"
      :class="align === 'right' ? 'flex-row-reverse' : ''"
      @click="emit('sort', column)"
    >
      <slot />
      <component
        :is="icon"
        class="size-3.5"
        :class="active ? 'text-foreground' : 'opacity-40'"
      />
    </button>
  </TableHead>
</template>
