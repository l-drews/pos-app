import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  // Products that have been sold are soft-deleted (deletedAt set) so order
  // history and statistics keep their product rows; never-sold products are
  // hard-deleted.
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  price: integer("price").notNull(),
  barcode: text("barcode").unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const cartItems = sqliteTable("cart_items", {
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productUuid: text("product_uuid")
    .notNull()
    .unique()
    .references(() => products.uuid),
  count: integer("count").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});
