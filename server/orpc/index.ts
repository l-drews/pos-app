import { os } from "@orpc/server";
import { ORPCError } from "@orpc/client";
import type { Context } from "./context";
import { db } from "~~/server/utils/drizzle";
import { ServiceError } from "~~/server/utils/errors";

const STATUS_TO_CODE: Record<number, string> = {
  400: "BAD_REQUEST",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_CONTENT",
};

/**
 * Root builder scoped to the app Context.
 * All procedures in every component must be built from this base.
 */
export const base = os
  .$context<Context>()
  .use(async ({ next }) =>
    next({
      context: {
        db: db,
      },
    }),
  )
  .use(async ({ next }) => {
    try {
      return await next({});
    } catch (err) {
      if (err instanceof ServiceError) {
        throw new ORPCError(STATUS_TO_CODE[err.status] ?? "INTERNAL_SERVER_ERROR", {
          status: err.status,
          message: err.message,
        });
      }
      throw err;
    }
  });
