import { z } from "zod";
import { base } from "~~/server/orpc";
import type { Db } from "~~/server/utils/drizzle";
import { SettingsService } from "./service";

function makeService(db: Db) {
  return new SettingsService(db);
}

export const settingsRouter = base.router({
  get: base
    .input(z.object({ key: z.string().min(1) }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).get(input.key);
    }),

  set: base
    .input(z.object({ key: z.string().min(1), value: z.string() }))
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).set(input.key, input.value);
    }),
});
