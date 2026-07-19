import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { setupAutoUpdater } from "./updater.cjs";

const DEV_URL = "http://localhost:3030";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { secure: true, standard: true, supportFetchAPI: true },
  },
]);

let handler: InstanceType<typeof RPCHandler> | null = null;

async function setupDB() {
  // Only the packaged app owns its storage in userData. In electron:dev the
  // renderer is served by the Nuxt dev server (localhost:3030), which reads
  // images and the database relative to the project root — both processes
  // must share those locations, so leave the env unset and let the shared
  // defaults (./db.sqlite, .data/images) apply.
  if (app.isPackaged) {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = path.join(app.getPath("userData"), "pos.sqlite");
    }
    if (!process.env.IMAGES_DIR) {
      process.env.IMAGES_DIR = path.join(app.getPath("userData"), "images");
    }
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
    // Uploaded user images live in userData, not in the packaged frontend.
    if (pathname.startsWith("/images/") && process.env.IMAGES_DIR) {
      const imageFile = path.join(process.env.IMAGES_DIR, path.basename(pathname));
      return net.fetch(pathToFileURL(imageFile).toString());
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

  // An unreferenced MessagePortMain is closed when garbage collected, which
  // would silently kill the renderer's RPC channel mid-session — keep every
  // upgraded port referenced until it closes (renderer reload/reconnect).
  const activePorts = new Set<Electron.MessagePortMain>();

  ipcMain.on("start-orpc-server", (event) => {
    const [serverPort] = event.ports;
    if (!serverPort || !handler) return;
    activePorts.add(serverPort);
    serverPort.on("close", () => activePorts.delete(serverPort));
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
  setupAutoUpdater();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
