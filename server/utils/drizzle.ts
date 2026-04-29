import {
  drizzle,
  type BetterSQLiteTransaction,
} from "drizzle-orm/better-sqlite3";
import type { ExtractTablesWithRelations } from "drizzle-orm";

import { schema } from "~~/server/db/";

const databaseUrl = process.env.DATABASE_URL ?? "./db.sqlite";

export const tables = schema;
export const db = drizzle(databaseUrl, { schema });

export type Db = typeof db;

type Schema = typeof schema;
export type Tx = BetterSQLiteTransaction<
  Schema,
  ExtractTablesWithRelations<Schema>
>;
