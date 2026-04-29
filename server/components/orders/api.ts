import { z } from "zod";
import { base } from "~~/server/orpc";
import type { Db } from "~~/server/utils/drizzle";
import { TransactionService } from "~~/server/components/transactions/service";
import { OrderService } from "./service";

function makeService(db: Db) {
  const transactionService = new TransactionService(db);
  return new OrderService(db, transactionService);
}

export const orderRouter = base.router({
  create: base
    .input(z.object({ userUuid: z.uuid() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).create(input.userUuid);
    }),

  getAll: base.handler(async ({ context: { db } }) => {
    return await makeService(db).getAll();
  }),
});
