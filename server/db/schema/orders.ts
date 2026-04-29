import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { products } from "./products";

export const transactions = sqliteTable("transactions", {
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userUuid: text("user_uuid")
    .notNull()
    .references(() => users.uuid),
  amount: integer("amount").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const orders = sqliteTable("orders", {
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userUuid: text("user_uuid")
    .notNull()
    .references(() => users.uuid),
  amount: integer("amount"),
  transactionUuid: text("transaction_uuid")
    .notNull()
    .unique()
    .references(() => transactions.uuid),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const orderItems = sqliteTable("order_items", {
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderUuid: text("order_uuid")
    .notNull()
    .references(() => orders.uuid),
  productUuid: text("product_uuid")
    .notNull()
    .references(() => products.uuid),
  count: integer("count").notNull().default(1),
  amount: integer("amount").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});
