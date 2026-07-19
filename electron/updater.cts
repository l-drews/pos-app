import { app, dialog, shell, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";

const RELEASES_URL = "https://github.com/l-drews/pos-app/releases/latest";
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

// macOS requires a code-signed app for in-place auto-update; these builds are
// unsigned (no Apple Developer ID), so mac users are sent to the release page
// instead. Flip to `true`-everywhere once mac signing lands in release.yml.
const canInstallInPlace = process.platform !== "darwin";

let promptOpen = false;

function showDialog(options: Electron.MessageBoxOptions) {
  const win = BrowserWindow.getAllWindows()[0];
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
}

export function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;

  // Background checks must never surface error dialogs (offline is normal).
  autoUpdater.on("error", (err) => {
    console.error("[updater]", err);
  });

  autoUpdater.on("update-available", async (info) => {
    if (promptOpen) return;
    promptOpen = true;
    try {
      if (!canInstallInPlace) {
        const { response } = await showDialog({
          type: "info",
          title: "Update available",
          message: `Version ${info.version} is available (installed: ${app.getVersion()}).`,
          detail: "Automatic installation is not available on macOS yet. Open the download page to get the new version.",
          buttons: ["Open download page", "Later"],
          defaultId: 0,
          cancelId: 1,
        });
        if (response === 0) await shell.openExternal(RELEASES_URL);
        return;
      }

      const { response } = await showDialog({
        type: "info",
        title: "Update available",
        message: `Version ${info.version} is available (installed: ${app.getVersion()}).`,
        detail: "Download it in the background? You will be asked before the app restarts.",
        buttons: ["Download", "Later"],
        defaultId: 0,
        cancelId: 1,
      });
      if (response === 0) {
        try {
          await autoUpdater.downloadUpdate();
        } catch (err) {
          console.error("[updater] download failed", err);
          const { response: fallback } = await showDialog({
            type: "warning",
            title: "Update failed",
            message: "The update could not be downloaded automatically.",
            buttons: ["Open download page", "Close"],
            defaultId: 0,
            cancelId: 1,
          });
          if (fallback === 0) await shell.openExternal(RELEASES_URL);
        }
      }
    } finally {
      promptOpen = false;
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await showDialog({
      type: "info",
      title: "Update ready",
      message: `Version ${info.version} has been downloaded.`,
      detail: "Restart now to install it, or keep working — it will be installed when you quit the app.",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  const check = () => autoUpdater.checkForUpdates().catch((err) => {
    console.error("[updater] check failed", err);
  });
  check();
  setInterval(check, CHECK_INTERVAL_MS);
}
