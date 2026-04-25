import { base } from "~~/server/orpc";
import { db } from "~~/server/utils/drizzle";
import { ProductService } from "./service";

function makeService(db: db) {
  return new ProductService(db);
}

export const productRouter = base.router({
  getAll: base.handler(async ({ context: { db } }) => {
    return await makeService(db).getAll();
  }),
});
