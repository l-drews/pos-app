import { z } from "zod";
import { base } from "~~/server/orpc";
import type { db } from "~~/server/utils/drizzle";
import { AuthService } from "./service";

function makeService(db: db) {
  return new AuthService(db);
}

export const authRouter = base.router({
  login: base
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .handler(async ({ context: { db }, input }) => {
      return await makeService(db).login(input.username, input.password);
    }),
});
