import { z } from "zod";
import { base } from "~~/server/orpc";
import type { db } from "~~/server/utils/drizzle";
import { TransactionService } from "./service";

function makeService(db: db) {
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
});
