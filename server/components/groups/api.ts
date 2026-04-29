import { z } from "zod";
import { base } from "~~/server/orpc";
import type { Db } from "~~/server/utils/drizzle";
import { GroupService } from "./service";

function makeService(db: Db) {
  return new GroupService(db);
}

export const groupRouter = base.router({
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
