import { z } from "zod";
import { base } from "~~/server/orpc";
import type { Db } from "~~/server/utils/drizzle";
import { TransactionService } from "./service";

function makeService(db: Db) {
  return new TransactionService(db);
}

export const transactionRouter = base.router({
  create: base
    .input(
      z.object({
        userUuid: z.uuid(),
        amount: z.int(),
      }),
    )
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).create(input.amount, input.userUuid);
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
});
