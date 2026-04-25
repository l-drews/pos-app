import { drizzle } from "drizzle-orm/better-sqlite3";

import { schema } from "~~/server/db/";
export const tables = schema;

const databaseUrl = process.env.DATABASE_URL ?? "./db.sqlite";
const db = drizzle(databaseUrl);
type db = typeof db;
export { db };
