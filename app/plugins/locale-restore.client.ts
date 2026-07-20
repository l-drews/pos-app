// Restores the language stored in the database (settings key "locale").
// The i18n cookie applies instantly at boot; the database value is the
// installation-wide source of truth and corrects the locale once loaded.
export default defineNuxtPlugin({
  name: "locale-restore",
  dependsOn: ["orpc"],
  setup(nuxtApp) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = nuxtApp.$client as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const i18n = (nuxtApp as any).$i18n;

    // Deliberately not awaited: app boot must not block on (or break with)
    // an unreachable backend.
    client.settings
      .get({ key: "locale" })
      .then((row: { value: string } | null) => {
        if (!row) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const known = (i18n.locales.value as any[]).some((l) => l.code === row.value);
        if (known && i18n.locale.value !== row.value) {
          return i18n.setLocale(row.value);
        }
      })
      .catch(() => {
        // No persisted locale yet, or backend unavailable — keep the default.
      });
  },
});
