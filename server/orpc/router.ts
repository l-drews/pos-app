import { os } from "@orpc/server";
import { productRouter } from "../components/products/api";

const ping = os.handler(async () => "ping");
const pong = os.handler(async () => "pong");

export const router = {
  ping,
  pong,
  products: productRouter,
};
