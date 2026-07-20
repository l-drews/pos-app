/* Electron integration test for product soft deletion over the real RPC channel. */
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

async function rejects(promise: Promise<unknown>): Promise<{ code?: string; message?: string } | null> {
  try {
    await promise;
    return null;
  } catch (err) {
    return err as { code?: string; message?: string };
  }
}

app.whenReady().then(async () => {
  try {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pos-softdel-"));
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

    // A never-sold product is hard-deleted.
    const unsold = await client.products.create({ name: "Never Sold", price: 100 });
    await client.products.delete({ uuid: unsold.uuid });
    const allWithDeleted = await client.products.getAll({ includeDeleted: true });
    check("never-sold product is hard-deleted", !allWithDeleted.some((p: any) => p.uuid === unsold.uuid));

    // Sell a product, then delete it -> soft delete.
    const cola = await client.products.create({ name: "Cola", price: 150, barcode: "4006381" });
    const user = await client.users.create({
      firstName: "Mia",
      lastName: "Muster",
      birthDate: "2012-01-01",
      generateBarcode: true,
    });
    await client.transactions.create({ userUuid: user.uuid, amount: 1000 });
    await client.cart.addItem({ productUuid: cola.uuid });
    await client.orders.create({ userUuid: user.uuid });

    const archived = await client.products.delete({ uuid: cola.uuid });
    check("sold product is archived, not deleted", archived.deletedAt != null);

    const activeList = await client.products.getAll();
    check("archived product hidden from the catalog", !activeList.some((p: any) => p.uuid === cola.uuid));
    const fullList = await client.products.getAll({ includeDeleted: true });
    check("archived product visible with includeDeleted", fullList.some((p: any) => p.uuid === cola.uuid));

    const scanErr = await rejects(client.products.getByBarcode({ barcode: "4006381" }));
    check("archived barcode is not scannable", scanErr?.code === "NOT_FOUND", scanErr?.code);
    const cartErr = await rejects(client.cart.addItem({ barcode: "4006381" }));
    check("archived product cannot be added to the cart", cartErr?.code === "NOT_FOUND", cartErr?.code);

    check("order history keeps the product", (await client.orders.getAll()).length === 1);

    // Restore brings it back.
    await client.products.restore({ uuid: cola.uuid });
    const restoredList = await client.products.getAll();
    check("restored product is back in the catalog", restoredList.some((p: any) => p.uuid === cola.uuid));
    const scanned = await client.products.getByBarcode({ barcode: "4006381" });
    check("restored product is scannable again", scanned.uuid === cola.uuid);

    // Creating over an archived product's barcode restores that product.
    await client.products.delete({ uuid: cola.uuid });
    const recreated = await client.products.create({ name: "Cola Zero", price: 180, barcode: "4006381" });
    check("create over archived barcode restores the same row", recreated.uuid === cola.uuid);
    check("restored row carries the new data", recreated.name === "Cola Zero" && recreated.price === 180 && !recreated.deletedAt);

    // Conflicts with an active product are a clear 409, not a 500.
    const conflict = await rejects(client.products.create({ name: "Cola Zero", price: 100 }));
    check("active name conflict is a CONFLICT error", conflict?.code === "CONFLICT", conflict?.code);
    const barcodeConflict = await rejects(client.products.create({ name: "Other", price: 100, barcode: "4006381" }));
    check("active barcode conflict is a CONFLICT error", barcodeConflict?.code === "CONFLICT", barcodeConflict?.code);

    console.log(failures === 0 ? "ELECTRON-TEST RESULT: PASS" : `ELECTRON-TEST RESULT: FAIL (${failures})`);
    process.exitCode = failures === 0 ? 0 : 1;
  } catch (err) {
    console.error("ELECTRON-TEST RESULT: HARNESS ERROR", err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
