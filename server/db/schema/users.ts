import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const groups = sqliteTable("groups", {
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const users = sqliteTable("users", {
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthDate: integer("birth_date", { mode: "timestamp_ms" }).notNull(),
  groupUuid: text("group_uuid").references(() => groups.uuid),
  barcode: text("barcode").unique(),
  imagePath: text("image_path"),
  balance: integer("balance").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const userLogins = sqliteTable("user_logins", {
  userUuid: text("user_uuid")
    .primaryKey()
    .references(() => users.uuid),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});
