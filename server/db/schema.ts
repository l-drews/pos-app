import { relations } from "drizzle-orm";
import { groups, userLogins, users } from "./schema/users.ts";
import { cartItems, products } from "./schema/products.ts";
import { orderItems, orders, transactions } from "./schema/orders.ts";

export * from "./schema/users.ts";
export * from "./schema/products.ts";
export * from "./schema/orders.ts";

export const groupsRelations = relations(groups, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  group: one(groups, { fields: [users.groupUuid], references: [groups.uuid] }),
  login: one(userLogins),
  orders: many(orders),
  transactions: many(transactions),
}));

export const userLoginsRelations = relations(userLogins, ({ one }) => ({
  user: one(users, {
    fields: [userLogins.userUuid],
    references: [users.uuid],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  cartItem: one(cartItems),
  orderItems: many(orderItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productUuid],
    references: [products.uuid],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userUuid],
    references: [users.uuid],
  }),
  order: one(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userUuid], references: [users.uuid] }),
  transaction: one(transactions, {
    fields: [orders.transactionUuid],
    references: [transactions.uuid],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderUuid],
    references: [orders.uuid],
  }),
  product: one(products, {
    fields: [orderItems.productUuid],
    references: [products.uuid],
  }),
}));
