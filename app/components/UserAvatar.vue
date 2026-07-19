<script setup lang="ts">
import { User } from "lucide-vue-next";

// Renders the user image when available, otherwise a placeholder icon.
// Size/extra classes are passed through from the parent onto the root.
defineProps<{ src?: string | null }>();
</script>

<template>
  <div
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground"
  >
    <img v-if="src" :src="src" alt="" class="h-full w-full object-cover" />
    <User v-else class="h-1/2 w-1/2" />
  </div>
</template>
