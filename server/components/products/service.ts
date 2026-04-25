import { type db, tables } from "~~/server/utils/drizzle";

export class ProductService {
  constructor(private db: db) {}
  async getAll() {
    return await this.db.select().from(tables.products);
  }
}
