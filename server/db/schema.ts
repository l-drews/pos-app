import { relations } from "drizzle-orm";
import { groups, users } from "./schema/users";
import { cartItems, products } from "./schema/products";
import { orderItems, orders, transactions } from "./schema/orders";

export * from "./schema/users";
export * from "./schema/products";
export * from "./schema/orders";

export const groupsRelations = relations(groups, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  group: one(groups, { fields: [users.groupUuid], references: [groups.uuid] }),
  orders: many(orders),
  transactions: many(transactions),
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
