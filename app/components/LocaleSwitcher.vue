<script setup lang="ts">
import type { Locale } from "vue-i18n";
import type { RouterClient } from "@orpc/server";
import type { Router } from "~~/server/orpc/router";

const { locale, locales, setLocale } = useI18n();
// Nuxt's injection-type inference does not surface $client; pin it to the
// real router type instead of erasing it with `any`.
const client = useNuxtApp().$client as RouterClient<Router>;

// Compact button labels; the full edition name lives in the tooltip.
const SHORT_LABELS: Record<string, string> = { "de-weseby": "we" };
const shortLabel = (code: string) => SHORT_LABELS[code] ?? code;

function select(code: Locale) {
  setLocale(code);
  // Persist as the installation-wide preference. Failures are swallowed;
  // worst case the database still holds the previous locale and restores it
  // on the next launch (the database wins over the cookie at boot).
  client.settings.set({ key: "locale", value: code }).catch(() => {});
}
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
      @click="select(l.code)"
    >
      {{ shortLabel(l.code) }}
    </button>
  </div>
</template>
