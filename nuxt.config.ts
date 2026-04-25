// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,

  devServer: {
    port: 3030,
  },

  css: [
    "@mdi/font/css/materialdesignicons.min.css",
    "@oruga-ui/theme-oruga/style.css",
  ],

  vite: {
    optimizeDeps: {
      include: [
        "@orpc/client",
        "@orpc/client/fetch",
        "@orpc/server",
        "@orpc/vue-colada",
        "drizzle-orm",
        "drizzle-orm/sqlite-core",
        "jose",
      ],
    },
  },

  modules: ["@pinia/nuxt", "@pinia/colada-nuxt", "@nuxtjs/tailwindcss"],
});