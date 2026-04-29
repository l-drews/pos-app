import { z } from "zod";
import { base } from "~~/server/orpc";
import type { Db } from "~~/server/utils/drizzle";
import { CartService } from "./service";

function makeService(db: Db) {
  return new CartService(db);
}

export const cartRouter = base.router({
  addItem: base
    .input(
      z.object({
        productUuid: z.uuid().optional(),
        barcode: z.string().optional(),
      }),
    )
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).addItem(input);
    }),

  getAll: base.handler(async ({ context: { db } }) => {
    return await makeService(db).getAll();
  }),

  getByUuid: base
    .input(z.object({ uuid: z.uuid() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).getByUuid(input.uuid);
    }),

  update: base
    .input(
      z.object({
        uuid: z.uuid(),
        count: z.int().min(1),
      }),
    )
    .handler(async ({ context: { db }, input }) => {
      const { uuid, ...data } = input;
      return await makeService(db).update(uuid, data);
    }),

  delete: base
    .input(z.object({ uuid: z.uuid() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).delete(input.uuid);
    }),
});
