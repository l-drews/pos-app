import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const DEV_URL = "http://localhost:3030";

let handler: InstanceType<typeof RPCHandler> | null = null;

async function setupDB() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = path.join(app.getPath("userData"), "pos.sqlite");
  }

  const { getDb } = await import("../server/utils/drizzle");
  const migrationsFolder = path.join(
    __dirname,
    "..",
    "..",
    "server",
    "db",
    "migrations",
  );
  migrate(getDb(), { migrationsFolder });
}

async function setupORPC() {
  const { router } = await import("../server/orpc/router");

  handler = new RPCHandler(router, {
    interceptors: [
      onError((e: unknown) => {
        console.error("[orpc]", e);
      }),
    ],
  });

  ipcMain.on("start-orpc-server", (event) => {
    const [serverPort] = event.ports;
    if (!serverPort || !handler) return;
    handler.upgrade(serverPort, { context: {} });
    serverPort.start();
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (!app.isPackaged) {
    await win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(
      path.join(__dirname, "..", ".output", "public", "index.html"),
    );
  }
}

app.whenReady().then(async () => {
  await setupDB();
  await setupORPC();
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
