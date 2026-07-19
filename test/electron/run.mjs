/* Bundles and runs the Electron integration test (test/electron/*.mts). */
import { build } from "esbuild";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "node_modules", ".cache", "pos-electron-test");

if (!existsSync(path.join(root, ".output", "public", "index.html"))) {
  console.error("Missing .output/public — run `pnpm generate` first.");
  process.exit(1);
}
if (!existsSync(path.join(root, "electron", "dist", "preload.cjs"))) {
  console.error("Missing electron/dist — run `pnpm electron:compile` first.");
  process.exit(1);
}

await build({
  entryPoints: [path.join(root, "test", "electron", "channel-recovery.mts")],
  outfile: path.join(outDir, "channel-recovery.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  packages: "external",
  alias: { "~~": root },
});

const electronBinary = require("electron");
const args = [path.join(outDir, "channel-recovery.cjs")];
// CI runners can't use Chromium's SUID sandbox (not setuid root there); the
// harness only loads our own generated frontend, so it is safe to disable.
if (process.env.CI) args.unshift("--no-sandbox");
const child = spawn(electronBinary, args, {
  stdio: "inherit",
  cwd: root,
});
child.on("exit", (code) => process.exit(code ?? 1));
