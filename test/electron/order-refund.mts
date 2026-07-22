/* Electron integration test for order deletion with refund over the real RPC channel. */
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pos-refund-"));
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

    // Setup: a user with 10.00 balance buys 2x Cola (1.50 each).
    const cola = await client.products.create({ name: "Cola", price: 150 });
    const user = await client.users.create({
      firstName: "Mia",
      lastName: "Muster",
      birthDate: "2012-01-01",
      generateBarcode: true,
    });
    await client.transactions.create({ userUuid: user.uuid, amount: 1000 });
    await client.cart.addItem({ productUuid: cola.uuid });
    await client.cart.addItem({ productUuid: cola.uuid });
    const order = await client.orders.create({ userUuid: user.uuid });

    let paid = await client.users.getByUuid({ uuid: user.uuid });
    check("payment deducted the balance", paid.balance === 700, String(paid.balance));

    // Delete the order: money back, order and its debit transaction gone.
    await client.orders.delete({ uuid: order.uuid });

    const refunded = await client.users.getByUuid({ uuid: user.uuid });
    check("refund restored the balance", refunded.balance === 1000, String(refunded.balance));

    const orders = await client.orders.getByUser({ userUuid: user.uuid });
    check("order is gone", orders.length === 0, String(orders.length));

    const transactions = await client.transactions.getAll();
    const userTxns = transactions.filter((t: any) => t.userUuid === user.uuid);
    check(
      "only the deposit transaction remains",
      userTxns.length === 1 && userTxns[0].amount === 1000,
      JSON.stringify(userTxns.map((t: any) => t.amount)),
    );

    const sales = await client.orders.getSalesByProduct({ productUuid: cola.uuid });
    check("order items are gone from product sales", sales.length === 0, String(sales.length));

    // The refunded balance is spendable again.
    await client.cart.addItem({ productUuid: cola.uuid });
    const reorder = await client.orders.create({ userUuid: user.uuid });
    check("user can order again after the refund", reorder.user.balance === 850, String(reorder.user.balance));

    // Deleting twice (or an unknown order) is a clean 404.
    const missingErr = await rejects(client.orders.delete({ uuid: order.uuid }));
    check("deleting a deleted order is NOT_FOUND", missingErr?.code === "NOT_FOUND", missingErr?.code);

    console.log(failures === 0 ? "ALL OK" : `${failures} FAILURES`);
    process.exit(failures === 0 ? 0 : 1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
