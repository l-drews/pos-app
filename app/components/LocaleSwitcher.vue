<script setup lang="ts">
const { locale, locales, setLocale } = useI18n();

// Compact button labels; the full edition name lives in the tooltip.
const SHORT_LABELS: Record<string, string> = { "de-weseby": "we" };
const shortLabel = (code: string) => SHORT_LABELS[code] ?? code;
</script>

<template>
  <div class="flex justify-center gap-1" data-testid="locale-switcher">
    <button
      v-for="l in locales"
      :key="l.code"
      type="button"
      class="rounded px-1.5 py-0.5 text-xs uppercase"
      :class="
        locale === l.code
          ? 'bg-sidebar-accent font-semibold text-sidebar-primary'
          : 'text-muted-foreground hover:text-sidebar-foreground'
      "
      :title="l.name"
      @click="setLocale(l.code)"
    >
      {{ shortLabel(l.code) }}
    </button>
  </div>
</template>
