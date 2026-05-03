import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  packages: "external",
  alias: { "~~": root },
  sourcemap: true,
  logLevel: "info",
};

await Promise.all([
  build({
    ...common,
    entryPoints: [path.join(__dirname, "main.cts")],
    outfile: path.join(__dirname, "dist", "main.cjs"),
  }),
  build({
    ...common,
    entryPoints: [path.join(__dirname, "preload.cts")],
    outfile: path.join(__dirname, "dist", "preload.cjs"),
  }),
]);
