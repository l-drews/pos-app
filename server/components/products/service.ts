import { and, eq, isNull, or } from "drizzle-orm";
import { type Db, tables } from "~~/server/utils/drizzle";
import { ConflictError, NotFoundError } from "~~/server/utils/errors";

export class ProductService {
  constructor(private db: Db) {}

  async create(data: { name: string; price: number; barcode?: string }) {
    // The name and barcode unique constraints include soft-deleted rows.
    // A conflict with an active product is an error; a conflict with an
    // archived product restores it — it's the same real-world product
    // coming back into the catalog.
    const conflicts = await this.db
      .select()
      .from(tables.products)
      .where(
        data.barcode
          ? or(
              eq(tables.products.name, data.name),
              eq(tables.products.barcode, data.barcode),
            )
          : eq(tables.products.name, data.name),
      );

    const active = conflicts.find((p) => !p.deletedAt);
    if (active) {
      throw new ConflictError(
        active.name === data.name
          ? `A product named "${data.name}" already exists`
          : `Barcode ${data.barcode} is already used by "${active.name}"`,
      );
    }

    const archived =
      conflicts.find((p) => p.name === data.name) ?? conflicts[0];
    if (archived) {
      // Free the barcode if a different archived product still holds it.
      for (const other of conflicts) {
        if (other.uuid !== archived.uuid && data.barcode && other.barcode === data.barcode) {
          await this.db
            .update(tables.products)
            .set({ barcode: null })
            .where(eq(tables.products.uuid, other.uuid));
        }
      }
      const [restored] = await this.db
        .update(tables.products)
        .set({
          name: data.name,
          price: data.price,
          barcode: data.barcode ?? archived.barcode,
          deletedAt: null,
        })
        .where(eq(tables.products.uuid, archived.uuid))
        .returning();
      return restored;
    }

    const [product] = await this.db
      .insert(tables.products)
      .values(data)
      .returning();
    return product;
  }

  async getAll(includeDeleted = false) {
    return await this.db
      .select()
      .from(tables.products)
      .where(includeDeleted ? undefined : isNull(tables.products.deletedAt));
  }

  async getByUuid(uuid: string) {
    // Archived products stay reachable here — order history links to them.
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
      .where(
        and(
          eq(tables.products.barcode, barcode),
          isNull(tables.products.deletedAt),
        ),
      )
      .get();
    if (!product) throw new NotFoundError("Product", barcode);
    return product;
  }

  async update(
    uuid: string,
    data: { name?: string; price?: number; barcode?: string | null },
  ) {
    try {
      const [updated] = await this.db
        .update(tables.products)
        .set(data)
        .where(eq(tables.products.uuid, uuid))
        .returning();
      if (!updated) throw new NotFoundError("Product", uuid);
      return updated;
    } catch (err) {
      if (err instanceof Error && `${err.cause ?? err.message}`.includes("UNIQUE constraint failed")) {
        throw new ConflictError(
          "Name or barcode is already in use (possibly by a deleted product)",
        );
      }
      throw err;
    }
  }

  async delete(uuid: string) {
    const product = await this.db
      .select()
      .from(tables.products)
      .where(eq(tables.products.uuid, uuid))
      .get();
    if (!product) throw new NotFoundError("Product", uuid);

    // The cart is transient — a deleted product leaves it either way.
    await this.db
      .delete(tables.cartItems)
      .where(eq(tables.cartItems.productUuid, uuid));

    const sold = await this.db
      .select({ uuid: tables.orderItems.uuid })
      .from(tables.orderItems)
      .where(eq(tables.orderItems.productUuid, uuid))
      .limit(1)
      .get();

    if (sold) {
      // Order history references this product — archive instead of delete.
      const [archived] = await this.db
        .update(tables.products)
        .set({ deletedAt: new Date() })
        .where(eq(tables.products.uuid, uuid))
        .returning();
      return archived;
    }

    const [deleted] = await this.db
      .delete(tables.products)
      .where(eq(tables.products.uuid, uuid))
      .returning();
    return deleted;
  }

  async restore(uuid: string) {
    const [restored] = await this.db
      .update(tables.products)
      .set({ deletedAt: null })
      .where(eq(tables.products.uuid, uuid))
      .returning();
    if (!restored) throw new NotFoundError("Product", uuid);
    return restored;
  }
}
