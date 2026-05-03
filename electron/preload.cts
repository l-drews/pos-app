import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("__electronORPC", { ready: true });

window.addEventListener("message", (event) => {
  if (event.data === "start-orpc-client") {
    const [port] = event.ports;
    if (!port) return;
    ipcRenderer.postMessage("start-orpc-server", null, [port]);
  }
});
