import {
  createOruga,
  OrugaComponentPlugins,
} from "@oruga-ui/oruga-next";

export default defineNuxtPlugin((nuxtApp) => {
  const oruga = createOruga(
    { iconPack: "mdi" },
    Object.values(OrugaComponentPlugins),
  );
  nuxtApp.vueApp.use(oruga);
});
