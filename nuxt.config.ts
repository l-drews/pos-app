import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json";

function git(command: string): string {
  try {
    return execSync(command, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

// Captured once when the build (or dev server) starts. A "-dirty" suffix
// marks builds made from uncommitted changes.
const gitSha = git("git rev-parse --short HEAD") || "unknown";
const gitDirty = git("git status --porcelain") !== "";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,

  runtimeConfig: {
    public: {
      version: pkg.version,
      gitSha: gitDirty ? `${gitSha}-dirty` : gitSha,
      buildTime: new Date().toISOString(),
    },
  },

  devServer: {
    port: 3030,
  },

  modules: [
    "@pinia/nuxt",
    "@pinia/colada-nuxt",
    "@nuxtjs/tailwindcss",
    "shadcn-nuxt",
    "@nuxt/test-utils/module",
    "@nuxtjs/i18n",
  ],

  i18n: {
    // no_prefix: locale is pure UI state — URL-prefixed locales would break
    // the Electron app:// SPA fallback and hardcoded navigateTo() paths.
    strategy: "no_prefix",
    defaultLocale: "en",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "de", name: "Deutsch", file: "de.json" },
      // Weseby Edition: German with the summer camp's terminology (groups are
      // "Zelte", users are "LaKis"). Its file only holds the overrides —
      // later files win, everything else merges from de.json.
      { code: "de-weseby", name: "Weseby Edition", files: ["de.json", "de-weseby.json"] },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "pos-locale",
    },
  },

  css: ["~/assets/css/tailwind.css", "vue-sonner/style.css"],

  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },

  vite: {
    optimizeDeps: {
      include: [
        "@orpc/client",
        "@orpc/client/fetch",
        "@orpc/server",
        "@orpc/vue-colada",
        "drizzle-orm",
        "drizzle-orm/sqlite-core",
        "vue-currency-input",
        "@vueuse/core",
        "lucide-vue-next",
        "class-variance-authority",
        "reka-ui",
        "clsx",
        "tailwind-merge",
      ],
    },
  },
});
