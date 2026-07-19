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

  list: base
    .input(
      z.object({
        limit: z.int().min(1).max(200).default(50),
        offset: z.int().min(0).default(0),
        sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).list(
        input.limit,
        input.offset,
        input.sortBy,
        input.sortDir,
      );
    }),

  getByUser: base
    .input(z.object({ userUuid: z.uuid() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).getByUser(input.userUuid);
    }),

  getSalesByProduct: base
    .input(z.object({ productUuid: z.uuid() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).getSalesByProduct(input.productUuid);
    }),

  getByRange: base
    .input(
      z
        .object({
          // Epoch milliseconds — the client computes local-day boundaries.
          from: z.int().min(0),
          to: z.int().min(0),
        })
        .refine((range) => range.to > range.from, "to must be after from"),
    )
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).getByRange(new Date(input.from), new Date(input.to));
    }),
});
