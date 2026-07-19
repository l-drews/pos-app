/* Electron integration test for the oRPC message-port channel.
 *
 * Mirrors electron/main.cts wiring with the real preload, real generated
 * frontend (app:// protocol), and real router. Verifies:
 *   A) scanning a product barcode updates the cart UI without a reload
 *   B) after the server-side MessagePort dies (simulating the documented
 *      Electron GC hazard / sleep-wake channel loss), the renderer
 *      re-establishes a channel and scanning still works — the failure mode
 *      previously only recoverable via a manual CMD+R.
 *
 * Run via: pnpm test:electron
 */
import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// The bundled test runs from node_modules/.cache; the runner sets cwd to the
// project root.
const PROJECT = process.cwd();
const PUBLIC_DIR = path.join(PROJECT, ".output", "public");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok" : "FAIL"} - ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

app.whenReady().then(async () => {
  let win: BrowserWindow | null = null;
  try {
    const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pos-test-")), "pos.sqlite");
    process.env.DATABASE_URL = dbPath;
    const { getDb, tables } = await import("~~/server/utils/drizzle");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    migrate(getDb() as any, { migrationsFolder: path.join(PROJECT, "server", "db", "migrations") });
    getDb().insert(tables.products).values({ name: "TestCola", price: 150, barcode: "4006381" }).run();

    const { router } = await import("~~/server/orpc/router");
    const handler = new RPCHandler(router, {
      interceptors: [onError((e: unknown) => console.error("[orpc]", e))],
    });

    // Track upgraded ports so the test can kill them (scenario B).
    const serverPorts: Electron.MessagePortMain[] = [];
    ipcMain.on("start-orpc-server", (event) => {
      const [serverPort] = event.ports;
      if (!serverPort) return;
      serverPorts.push(serverPort);
      handler.upgrade(serverPort, { context: {} });
      serverPort.start();
    });

    protocol.handle("app", (request) => {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      const relative = path.extname(pathname) !== "" ? pathname.slice(1) : "index.html";
      return net.fetch(pathToFileURL(path.resolve(PUBLIC_DIR, relative)).toString());
    });

    win = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        preload: path.join(PROJECT, "electron", "dist", "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    win.webContents.on("console-message", (_e, _l, message) => {
      if (message.includes("[orpc]")) console.log("[renderer]", message.slice(0, 200));
    });

    await win.loadURL("app://./shop");
    await sleep(3500);

    const scan = () =>
      win!.webContents.executeJavaScript(`
        for (const key of "4006381") {
          window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        }
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        "scanned";
      `);
    const uiShowsCount = (count: number) =>
      win!.webContents.executeJavaScript(`
        (() => {
          const rows = [...document.querySelectorAll("tr")];
          const row = rows.find((r) => r.innerText.includes("TestCola"));
          return row ? row.innerText.includes(${JSON.stringify(String(count))}) : false;
        })();
      `);
    const dbCount = () =>
      getDb().select().from(tables.cartItems).all()[0]?.count ?? 0;

    // Scenario A: healthy channel.
    check("channel established", serverPorts.length >= 1, `ports=${serverPorts.length}`);
    await scan();
    await sleep(2500);
    check("A: scan reaches the database", dbCount() === 1, `count=${dbCount()}`);
    check("A: scan updates the UI without reload", await uiShowsCount(1));

    // Scenario B: the server-side port dies mid-session (GC hazard/sleep-wake).
    for (const port of serverPorts.splice(0)) port.close();
    await sleep(1500); // renderer must notice and re-establish

    check("B: renderer re-established a channel", serverPorts.length >= 1, `new ports=${serverPorts.length}`);
    await scan();
    await sleep(2500);
    check("B: scan after channel loss reaches the database", dbCount() === 2, `count=${dbCount()}`);
    check("B: scan after channel loss updates the UI without reload", await uiShowsCount(2));

    console.log(failures === 0 ? "ELECTRON-TEST RESULT: PASS" : `ELECTRON-TEST RESULT: FAIL (${failures})`);
    process.exitCode = failures === 0 ? 0 : 1;
  } catch (err) {
    console.error("ELECTRON-TEST RESULT: HARNESS ERROR", err);
    process.exitCode = 1;
  } finally {
    win?.destroy();
    app.quit();
  }
});
