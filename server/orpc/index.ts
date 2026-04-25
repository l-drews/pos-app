import { os } from "@orpc/server";
import type { Context } from "./context";
import { db } from "~~/server/utils/drizzle";

/**
 * Root builder scoped to the app Context.
 * All procedures in every component must be built from this base.
 */
export const base = os.$context<Context>().use(async ({ next }) =>
  next({
    context: {
      db: db,
    },
  }),
);

/**
 * Public procedure – no authentication required.
 * Use this only for genuinely open endpoints (e.g. health-check, OpenAPI spec).
 */
export const publicProcedure = base;
