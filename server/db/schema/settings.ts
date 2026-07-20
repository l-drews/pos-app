import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Generic key-value store for installation-wide preferences (e.g. locale). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
