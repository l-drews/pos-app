import type { Composer } from "vue-i18n";
import type { RouterClient } from "@orpc/server";
import type { Router } from "~~/server/orpc/router";

// Restores the language stored in the database (settings key "locale").
// The i18n cookie applies instantly at boot; the database value is the
// installation-wide source of truth and corrects the locale once loaded.
export default defineNuxtPlugin({
  name: "locale-restore",
  dependsOn: ["orpc"],
  setup(nuxtApp) {
    // Nuxt's injection-type inference does not surface these two, so pin
    // them to the real types instead of erasing them with `any`.
    const client = nuxtApp.$client as RouterClient<Router>;
    const i18n = nuxtApp.$i18n as Composer;
    const bootLocale = i18n.locale.value;

    // Deliberately not awaited: app boot must not block on (or break with)
    // an unreachable backend.
    client.settings
      .get({ key: "locale" })
      .then((row) => {
        if (!row) return;
        // A late response must not clobber a locale the user picked while
        // the request was in flight.
        if (i18n.locale.value !== bootLocale) return;
        const match = i18n.locales.value.find((l) => l.code === row.value);
        if (match && i18n.locale.value !== match.code) {
          return i18n.setLocale(match.code);
        }
      })
      .catch(() => {
        // No persisted locale yet, or backend unavailable — keep the default.
      });
  },
});
