import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const DEV_URL = "http://localhost:3030";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { secure: true, standard: true, supportFetchAPI: true },
  },
]);

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  migrate(getDb() as any, { migrationsFolder });
}

function setupAppProtocol() {
  const publicDir = path.resolve(__dirname, "..", "..", ".output", "public");
  protocol.handle("app", (request) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    // Paths without a file extension are client-side routes → SPA fallback.
    const hasExt = path.extname(pathname) !== "";
    const relative = hasExt ? pathname.slice(1) : "index.html";
    const filePath = path.resolve(publicDir, relative);
    if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
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
    await win.loadURL("app://./");
  }
}

app.whenReady().then(async () => {
  await setupDB();
  await setupORPC();
  setupAppProtocol();
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
