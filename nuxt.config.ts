import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,

  devServer: {
    port: 3030,
  },

  modules: [
    "@pinia/nuxt",
    "@pinia/colada-nuxt",
    "@nuxtjs/tailwindcss",
    "shadcn-nuxt",
    "@nuxt/test-utils/module",
  ],

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
