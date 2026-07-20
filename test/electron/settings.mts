/* Electron integration test for the settings key-value store (locale persistence). */
import { app, MessageChannelMain } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";

const PROJECT = process.cwd();

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok" : "FAIL"} - ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

app.whenReady().then(async () => {
  try {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pos-settings-"));
    process.env.DATABASE_URL = path.join(tmp, "pos.sqlite");

    const { getDb } = await import("~~/server/utils/drizzle");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    migrate(getDb() as any, { migrationsFolder: path.join(PROJECT, "server", "db", "migrations") });

    const { router } = await import("~~/server/orpc/router");
    const handler = new RPCHandler(router, {
      interceptors: [onError((e: unknown) => console.error("[orpc]", e))],
    });
    const channel = new MessageChannelMain();
    handler.upgrade(channel.port1, { context: {} });
    channel.port1.start();
    const link = new RPCLink({ port: channel.port2 });
    channel.port2.start();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createORPCClient(link);

    const empty = await client.settings.get({ key: "locale" });
    check("get of an unset key returns null", empty === null);

    const saved = await client.settings.set({ key: "locale", value: "de-weseby" });
    check("set stores the locale", saved?.value === "de-weseby");

    const read = await client.settings.get({ key: "locale" });
    check("get returns the stored locale", read?.value === "de-weseby");

    await client.settings.set({ key: "locale", value: "en" });
    const updated = await client.settings.get({ key: "locale" });
    check("set upserts an existing key", updated?.value === "en");

    console.log(failures === 0 ? "ELECTRON-TEST RESULT: PASS" : `ELECTRON-TEST RESULT: FAIL (${failures})`);
    process.exitCode = failures === 0 ? 0 : 1;
  } catch (err) {
    console.error("ELECTRON-TEST RESULT: HARNESS ERROR", err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
