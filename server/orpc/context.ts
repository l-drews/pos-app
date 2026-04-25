import type { db } from "~~/server/utils/drizzle";

/**
 * oRPC request context.
 *
 * - `user`    – resolved from the session cookie (internal Nuxt calls)
 * - `db`      – injected DrizzleDB instance (only available on the server)
 */
export type Context = {
  db: db;
};
