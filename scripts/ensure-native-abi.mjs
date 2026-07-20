/* Ensures better-sqlite3 is built for the runtime about to use it.
 *
 * The project needs the native module in two ABI flavors: system Node for the
 * Nuxt dev server and db scripts, Electron for electron:dev/test/build. A
 * rebuild only happens when the current build doesn't match the requested
 * target, so repeated runs are free.
 *
 * Usage: node scripts/ensure-native-abi.mjs <node|electron>
 */
import { execSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const target = process.argv[2];
if (target !== "node" && target !== "electron") {
  console.error("usage: ensure-native-abi.mjs <node|electron>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const probe = ["-e", "require('better-sqlite3')"];

function loadsUnderNode() {
  return spawnSync(process.execPath, probe, { stdio: "ignore" }).status === 0;
}

function loadsUnderElectron() {
  const electronBinary = require("electron");
  return (
    spawnSync(electronBinary, probe, {
      stdio: "ignore",
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    }).status === 0
  );
}

if (target === "node") {
  if (!loadsUnderNode()) {
    console.log("better-sqlite3 is built for Electron — rebuilding for Node...");
    execSync("npm rebuild better-sqlite3", { stdio: "inherit" });
  }
} else {
  if (!loadsUnderElectron()) {
    console.log("better-sqlite3 is built for Node — rebuilding for Electron...");
    execSync("pnpm exec electron-builder install-app-deps", { stdio: "inherit" });
  }
}
