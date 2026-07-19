import { fileURLToPath } from "node:url";
import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    // Playwright e2e specs live in tests/e2e and must not be collected here.
    include: ["test/**/*.spec.ts"],
    environment: "nuxt",
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL(".", import.meta.url)),
        domEnvironment: "happy-dom",
      },
    },
  },
});
