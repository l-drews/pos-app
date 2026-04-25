import { z } from "zod";
import { base } from "~~/server/orpc";
import type { db } from "~~/server/utils/drizzle";
import { RoleService } from "./service";

function makeService(db: db) {
  return new RoleService(db);
}

export const roleRouter = base.router({
  create: base
    .input(z.object({ name: z.string().min(1) }))
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

  update: base
    .input(
      z.object({
        uuid: z.uuid(),
        name: z.string().min(1).optional(),
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
