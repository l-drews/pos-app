<script setup lang="ts">
import { OctagonXIcon } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    message: string;
    /** Total visible lifetime in ms (matches the toast's `duration`). */
    duration?: number;
    /** Provided by vue-sonner: true while the toaster is hovered/interacting. */
    isPaused?: boolean;
  }>(),
  { duration: 5000, isPaused: false },
);

const emit = defineEmits<{ closeToast: [] }>();

// Fraction of time left, 1 → 0. Drives the progress bar width.
const remaining = ref(1);
let raf = 0;
let last: number | null = null;

function frame(now: number) {
  if (last === null) last = now;
  const delta = now - last;
  last = now;

  // Only advance while sonner's own dismiss timer is running, so the bar
  // stays in sync with the actual time-to-dismiss (paused on hover).
  if (!props.isPaused) {
    remaining.value = Math.max(0, remaining.value - delta / props.duration);
  }

  if (remaining.value > 0) {
    raf = requestAnimationFrame(frame);
  }
}

onMounted(() => {
  raf = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
});
</script>

<template>
  <div
    role="alert"
    class="relative flex w-(--width) cursor-pointer items-center gap-3 overflow-hidden rounded-(--border-radius) border bg-popover p-4 text-[13px] text-popover-foreground shadow-[0px_4px_12px_rgba(0,0,0,0.1)]"
    @click="emit('closeToast')"
  >
    <OctagonXIcon class="size-4 shrink-0 text-destructive" />
    <span class="flex-1">{{ message }}</span>
    <div
      class="absolute inset-x-0 bottom-0 h-1 origin-left bg-destructive"
      :style="{ transform: `scaleX(${remaining})` }"
    />
  </div>
</template>
