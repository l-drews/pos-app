<script setup lang="ts">
interface Bucket {
  label: string;
  value: number;
}

const props = defineProps<{
  buckets: Bucket[];
  format: (value: number) => string;
}>();

const hovered = ref<number | null>(null);

// Nice 1/2/5 tick step so axis values land on clean numbers. Values are
// integers (cents or counts), so the step is kept integer too.
function niceStep(rough: number) {
  const pow = 10 ** Math.floor(Math.log10(rough));
  const frac = rough / pow;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return Math.max(1, Math.round(nice * pow));
}

// Domain always includes 0 — bars grow from a zero baseline, and deposit
// returns can push an hour's amount negative.
const scale = computed(() => {
  const values = props.buckets.map((b) => b.value);
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  const step = niceStep((rawMax - rawMin || 1) / 4);
  const max = Math.ceil(rawMax / step) * step || (rawMin < 0 ? 0 : step);
  const min = Math.floor(rawMin / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max; t += step) ticks.push(t);
  return { min, max, ticks };
});

function pct(value: number) {
  const { min, max } = scale.value;
  return ((value - min) / (max - min)) * 100;
}

// Label every band while they fit, then thin out (24 hourly bins max).
const labelEvery = computed(() => Math.ceil(props.buckets.length / 12));

const tooltip = computed(() => {
  if (hovered.value === null) return null;
  const bucket = props.buckets[hovered.value];
  if (!bucket) return null;
  const center = ((hovered.value + 0.5) / props.buckets.length) * 100;
  return {
    ...bucket,
    left: `clamp(3.5rem, ${center}%, calc(100% - 3.5rem))`,
    bottom: `calc(${Math.max(pct(bucket.value), pct(0))}% + 6px)`,
  };
});
</script>

<template>
  <div>
    <div class="flex text-xs">
      <!-- Y axis -->
      <div class="relative h-48 w-14 shrink-0">
        <span
          v-for="tick in scale.ticks"
          :key="tick"
          class="absolute right-2 translate-y-1/2 text-muted-foreground tabular-nums"
          :style="{ bottom: `${pct(tick)}%` }"
        >
          {{ format(tick) }}
        </span>
      </div>
      <!-- Plot -->
      <div class="relative h-48 flex-1">
        <div
          v-for="tick in scale.ticks"
          :key="tick"
          class="absolute inset-x-0 h-px"
          :class="tick === 0 ? 'bg-muted-foreground/50' : 'bg-border'"
          :style="{ bottom: `${pct(tick)}%` }"
        />
        <div class="absolute inset-0 flex">
          <div
            v-for="(bucket, i) in buckets"
            :key="bucket.label"
            class="relative flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            tabindex="0"
            :aria-label="`${bucket.label}: ${format(bucket.value)}`"
            @mouseenter="hovered = i"
            @mouseleave="hovered = null"
            @focus="hovered = i"
            @blur="hovered = null"
          >
            <div
              class="absolute left-1/2 w-[calc(100%-2px)] max-w-6 -translate-x-1/2 bg-chart-1"
              :class="[
                bucket.value >= 0 ? 'rounded-t' : 'rounded-b',
                hovered === i ? 'brightness-110' : '',
              ]"
              :style="{
                bottom: `${Math.min(pct(bucket.value), pct(0))}%`,
                height: `${Math.abs(pct(bucket.value) - pct(0))}%`,
              }"
            />
          </div>
        </div>
        <!-- Tooltip: value leads, label follows. Enhances only — the same
             values are on the axis, in aria-labels, and in the orders table. -->
        <div
          v-if="tooltip"
          class="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-center shadow-md"
          :style="{ left: tooltip.left, bottom: tooltip.bottom }"
        >
          <div class="text-sm font-semibold text-popover-foreground">
            {{ format(tooltip.value) }}
          </div>
          <div class="text-xs text-muted-foreground">{{ tooltip.label }}</div>
        </div>
      </div>
    </div>
    <!-- X axis -->
    <div class="flex pl-14 pt-1 text-xs text-muted-foreground">
      <span v-for="(bucket, i) in buckets" :key="bucket.label" class="flex-1 text-center">
        {{ i % labelEvery === 0 ? bucket.label : "" }}
      </span>
    </div>
  </div>
</template>
