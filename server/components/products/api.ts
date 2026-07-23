import { z } from "zod";
import { base } from "~~/server/orpc";
import type { Db } from "~~/server/utils/drizzle";
import { ProductService } from "./service";

function makeService(db: Db) {
  return new ProductService(db);
}

export const productRouter = base.router({
  create: base
    .input(
      z.object({
        name: z.string().min(1),
        price: z.int(),
        // "" (or whitespace) means "no barcode" and is stored as NULL —
        // never as "", which would collide on the unique constraint.
        barcode: z
          .string()
          .trim()
          .nullish()
          .transform((v) => (v === undefined ? undefined : v || null)),
      }),
    )
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).create(input);
    }),

  getAll: base
    .input(z.object({ includeDeleted: z.boolean().default(false) }).optional())
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).getAll(input?.includeDeleted ?? false);
    }),

  restore: base
    .input(z.object({ uuid: z.uuid() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).restore(input.uuid);
    }),

  getByUuid: base
    .input(z.object({ uuid: z.uuid() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).getByUuid(input.uuid);
    }),

  getByBarcode: base
    .input(z.object({ barcode: z.string().min(1) }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).getByBarcode(input.barcode);
    }),

  update: base
    .input(
      z.object({
        uuid: z.uuid(),
        name: z.string().min(1).optional(),
        price: z.int().optional(),
        // Absent = keep, ""/null = clear (normalized to NULL, never "").
        barcode: z
          .string()
          .trim()
          .nullish()
          .transform((v) => (v === undefined ? undefined : v || null)),
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
