import { z } from "zod";
import { base } from "~~/server/orpc";
import type { Db } from "~~/server/utils/drizzle";
import { UserService } from "./service";

function makeService(db: Db) {
  return new UserService(db);
}

export const userRouter = base.router({
  create: base
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        birthDate: z.string().min(1),
        groupUuid: z.uuid().optional(),
        barcode: z.string().optional(),
        generateBarcode: z.boolean().optional(),
      }),
    )
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).create(input);
    }),

  getAll: base.handler(async ({ context: { db } }) => {
    return await makeService(db).getAll();
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
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        birthDate: z.string().optional(),
        groupUuid: z.uuid().nullable().optional(),
        barcode: z.string().nullable().optional(),
        generateBarcode: z.boolean().optional(),
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

  importCsv: base
    .input(z.object({ csvContent: z.string().min(1) }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).importCsv(input.csvContent);
    }),
});