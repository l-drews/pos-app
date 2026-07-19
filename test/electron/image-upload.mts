/* Electron integration test for user image upload.
 *
 * Drives the real router over a MessageChannelMain (same serializer path the
 * renderer uses) with a real File, then serves the stored image through the
 * app:// protocol handler — verifying the whole chain the UI relies on.
 */
import { app, MessageChannelMain, net, protocol } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/message-port";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";

const PROJECT = process.cwd();
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
  try {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pos-img-"));
    process.env.DATABASE_URL = path.join(tmp, "pos.sqlite");
    process.env.IMAGES_DIR = path.join(tmp, "images");

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

    // Same images branch as electron/main.cts setupAppProtocol.
    protocol.handle("app", (request) => {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      if (pathname.startsWith("/images/") && process.env.IMAGES_DIR) {
        const imageFile = path.join(process.env.IMAGES_DIR, path.basename(pathname));
        return net.fetch(pathToFileURL(imageFile).toString());
      }
      return new Response("Not found", { status: 404 });
    });

    const bytesA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    const bytesB = Buffer.from([0x89, 0x50, 0x4e, 0x47, 9, 8, 7, 6]);

    // 1. Create a user with an image.
    const created = await client.users.create({
      firstName: "Ina",
      lastName: "Icon",
      birthDate: "2012-01-01",
      generateBarcode: true,
      image: new File([bytesA], "avatar.png", { type: "image/png" }),
    });
    check("create returns an imageUrl", typeof created.imageUrl === "string" && created.imageUrl.startsWith("/images/"), created.imageUrl);

    const storedA = path.join(process.env.IMAGES_DIR, path.basename(created.imageUrl));
    check("image stored on disk", fs.existsSync(storedA));
    check("stored bytes match upload", fs.existsSync(storedA) && fs.readFileSync(storedA).equals(bytesA));

    // 2. Serve it the way the renderer loads it.
    const res = await net.fetch(`app://.${created.imageUrl}`);
    const served = Buffer.from(await res.arrayBuffer());
    check("app:// serves the image", res.ok && served.equals(bytesA), `status=${res.status}`);

    // 3. getAll exposes the imageUrl the avatars bind to.
    const all = await client.users.getAll();
    check("getAll exposes imageUrl", all[0]?.imageUrl === created.imageUrl);

    // 4. Replacing the image cleans up the old file.
    const updated = await client.users.update({
      uuid: created.uuid,
      image: new File([bytesB], "avatar2.png", { type: "image/png" }),
    });
    const storedB = path.join(process.env.IMAGES_DIR, path.basename(updated.imageUrl));
    check("update returns a new imageUrl", updated.imageUrl !== created.imageUrl, updated.imageUrl);
    check("new image stored", fs.existsSync(storedB) && fs.readFileSync(storedB).equals(bytesB));
    await sleep(100);
    check("old image deleted", !fs.existsSync(storedA));

    console.log(failures === 0 ? "ELECTRON-TEST RESULT: PASS" : `ELECTRON-TEST RESULT: FAIL (${failures})`);
    process.exitCode = failures === 0 ? 0 : 1;
  } catch (err) {
    console.error("ELECTRON-TEST RESULT: HARNESS ERROR", err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
