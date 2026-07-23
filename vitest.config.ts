import { fileURLToPath } from "node:url";
import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    // Playwright e2e specs live in e2e/ and must not be collected here.
    include: ["test/**/*.spec.ts"],
    coverage: {
      // Only the client code is exercised by this suite — the server side is
      // covered by the electron integration tests, which are not
      // instrumented here.
      include: ["app/**/*.{ts,vue}"],
      // The shadcn-generated primitives are vendored code and would drown
      // out the numbers for our own components.
      exclude: ["app/components/ui/**"],
      reporter: ["text", "html"],
    },
    environment: "nuxt",
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL(".", import.meta.url)),
        domEnvironment: "happy-dom",
      },
    },
  },
});
