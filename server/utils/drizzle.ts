import { drizzle } from "drizzle-orm/better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "./db.sqlite";
const db = drizzle(databaseUrl);

export default db;
