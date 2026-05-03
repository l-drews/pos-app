import {
  drizzle,
  type BetterSQLiteTransaction,
} from "drizzle-orm/better-sqlite3";
import type { ExtractTablesWithRelations } from "drizzle-orm";

import { schema } from "~~/server/db/";

export const tables = schema;

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
