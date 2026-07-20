import {
  drizzle,
  type BetterSQLiteTransaction,
} from "drizzle-orm/better-sqlite3";
import { isNull, type ExtractTablesWithRelations } from "drizzle-orm";

import { schema } from "~~/server/db/";

export const tables = schema;

/**
 * Products visible to live flows (catalog, scanning, cart) — archived
 * (soft-deleted) rows are excluded. Order-history joins deliberately do NOT
 * use this: archived products must keep rendering there.
 */
export const productIsActive = () => isNull(tables.products.deletedAt);

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _db = drizzle(process.env.DATABASE_URL ?? "./db.sqlite", { schema });
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;

type Schema = typeof schema;
export type Tx = BetterSQLiteTransaction<
  Schema,
  ExtractTablesWithRelations<Schema>
>;
