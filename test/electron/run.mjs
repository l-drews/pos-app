/* Bundles and runs every Electron integration test (test/electron/*.mts). */
import { build } from "esbuild";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, "..", "..");
const outDir = path.join(root, "node_modules", ".cache", "pos-electron-test");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", cwd: root });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} failed`)),
    );
  });
}

// `nuxt build` replaces .output without the static SPA — regenerate if needed.
if (!existsSync(path.join(root, ".output", "public", "index.html"))) {
  console.log("No generated frontend found — running `pnpm generate`...");
  await run("pnpm", ["generate"]);
}
if (!existsSync(path.join(root, "electron", "dist", "preload.cjs"))) {
  console.log("No compiled Electron main found — running `pnpm electron:compile`...");
  await run("pnpm", ["electron:compile"]);
}

const electronBinary = require("electron");

function runOne(bundle) {
  return new Promise((resolve) => {
    const args = [bundle];
    // CI runners can't use Chromium's SUID sandbox (not setuid root there);
    // the harness only loads our own generated frontend, so it is safe.
    if (process.env.CI) args.unshift("--no-sandbox");
    const child = spawn(electronBinary, args, { stdio: "inherit", cwd: root });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

const entries = readdirSync(testDir).filter((f) => f.endsWith(".mts")).sort();
let failed = 0;
for (const entry of entries) {
  const bundle = path.join(outDir, entry.replace(/\.mts$/, ".cjs"));
  await build({
    entryPoints: [path.join(testDir, entry)],
    outfile: bundle,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    packages: "external",
    alias: { "~~": root },
  });
  console.log(`\n=== ${entry} ===`);
  const code = await runOne(bundle);
  if (code !== 0) failed++;
}

process.exit(failed === 0 ? 0 : 1);
