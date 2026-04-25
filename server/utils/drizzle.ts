import { drizzle } from "drizzle-orm/better-sqlite3";

import { schema } from "~~/server/db/";
export const tables = schema;

const databaseUrl = process.env.DATABASE_URL ?? "./db.sqlite";
const db = drizzle(databaseUrl, { schema });
type db = typeof db;

// Transaction type extracted from db.transaction() callback parameter
type tx = Parameters<Parameters<db["transaction"]>[0]>[0];

export type { db, tx };
export { db };
