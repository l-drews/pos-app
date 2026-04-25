import { os } from "@orpc/server";
import { productRouter } from "../components/products/api";
import { cartRouter } from "../components/cart/api";
import { groupRouter } from "../components/groups/api";
import { roleRouter } from "../components/roles/api";
import { transactionRouter } from "../components/transactions/api";
import { orderRouter } from "../components/orders/api";
import { userRouter } from "../components/users/api";
import { authRouter } from "../components/auth/api";

const ping = os.handler(async () => "ping");
const pong = os.handler(async () => "pong");

export const router = {
  ping,
  pong,
  products: productRouter,
  cart: cartRouter,
  groups: groupRouter,
  roles: roleRouter,
  transactions: transactionRouter,
  orders: orderRouter,
  users: userRouter,
  auth: authRouter,
};
