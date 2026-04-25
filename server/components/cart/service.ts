import { eq } from "drizzle-orm";
import { type db, tables } from "~~/server/utils/drizzle";
import { NotFoundError, ValidationError } from "~~/server/utils/errors";

export class CartService {
  constructor(private db: db) {}

  async addItem(input: { productUuid?: string; barcode?: string }) {
    let product;

    if (input.productUuid) {
      product = await this.db
        .select()
        .from(tables.products)
        .where(eq(tables.products.uuid, input.productUuid))
        .get();
    } else if (input.barcode) {
      product = await this.db
        .select()
        .from(tables.products)
        .where(eq(tables.products.barcode, input.barcode))
        .get();
    } else {
      throw new ValidationError("Either productUuid or barcode is required");
    }

    if (!product) throw new NotFoundError("Product");

    // Upsert: create or increment count
    const existing = await this.db
      .select()
      .from(tables.cartItems)
      .where(eq(tables.cartItems.productUuid, product.uuid))
      .get();

    if (existing) {
      const [updated] = await this.db
        .update(tables.cartItems)
        .set({ count: existing.count + 1 })
        .where(eq(tables.cartItems.uuid, existing.uuid))
        .returning();
      return { ...updated, product };
    }

    const [cartItem] = await this.db
      .insert(tables.cartItems)
      .values({ productUuid: product.uuid })
      .returning();
    return { ...cartItem, product };
  }

  async getAll() {
    const items = await this.db.select().from(tables.cartItems);
    const result = [];
    for (const item of items) {
      const product = await this.db
        .select()
        .from(tables.products)
        .where(eq(tables.products.uuid, item.productUuid))
        .get();
      result.push({ ...item, product });
    }
    return result;
  }

  async getByUuid(uuid: string) {
    const item = await this.db
      .select()
      .from(tables.cartItems)
      .where(eq(tables.cartItems.uuid, uuid))
      .get();
    if (!item) throw new NotFoundError("CartItem", uuid);

    const product = await this.db
      .select()
      .from(tables.products)
      .where(eq(tables.products.uuid, item.productUuid))
      .get();

    return { ...item, product };
  }

  async update(uuid: string, data: { count: number }) {
    if (data.count <= 0) {
      throw new ValidationError("Count must be greater than 0");
    }

    const [updated] = await this.db
      .update(tables.cartItems)
      .set(data)
      .where(eq(tables.cartItems.uuid, uuid))
      .returning();
    if (!updated) throw new NotFoundError("CartItem", uuid);
    return updated;
  }

  async delete(uuid: string) {
    const [deleted] = await this.db
      .delete(tables.cartItems)
      .where(eq(tables.cartItems.uuid, uuid))
      .returning();
    if (!deleted) throw new NotFoundError("CartItem", uuid);
    return deleted;
  }
}
