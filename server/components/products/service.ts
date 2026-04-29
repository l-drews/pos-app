import { eq } from "drizzle-orm";
import { type Db, tables } from "~~/server/utils/drizzle";
import { NotFoundError } from "~~/server/utils/errors";

export class ProductService {
  constructor(private db: Db) {}

  async create(data: { name: string; price: number; barcode?: string }) {
    const [product] = await this.db
      .insert(tables.products)
      .values(data)
      .returning();
    return product;
  }

  async getAll() {
    return await this.db.select().from(tables.products);
  }

  async getByUuid(uuid: string) {
    const product = await this.db
      .select()
      .from(tables.products)
      .where(eq(tables.products.uuid, uuid))
      .get();
    if (!product) throw new NotFoundError("Product", uuid);
    return product;
  }

  async getByBarcode(barcode: string) {
    const product = await this.db
      .select()
      .from(tables.products)
      .where(eq(tables.products.barcode, barcode))
      .get();
    if (!product) throw new NotFoundError("Product", barcode);
    return product;
  }

  async update(
    uuid: string,
    data: { name?: string; price?: number; barcode?: string | null },
  ) {
    const [updated] = await this.db
      .update(tables.products)
      .set(data)
      .where(eq(tables.products.uuid, uuid))
      .returning();
    if (!updated) throw new NotFoundError("Product", uuid);
    return updated;
  }

  async delete(uuid: string) {
    const [deleted] = await this.db
      .delete(tables.products)
      .where(eq(tables.products.uuid, uuid))
      .returning();
    if (!deleted) throw new NotFoundError("Product", uuid);
    return deleted;
  }
}
