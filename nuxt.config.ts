// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  devServer: {
    port: 3030,
  },
  vite: {
    optimizeDeps: {
      include: ["@orpc/client", "@orpc/client/fetch", "@orpc/server"],
    },
  },
});
