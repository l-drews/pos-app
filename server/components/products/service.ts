import { and, eq, or } from "drizzle-orm";
import { type Db, productIsActive, tables } from "~~/server/utils/drizzle";
import { ConflictError, NotFoundError } from "~~/server/utils/errors";

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    `${err.cause ?? err.message}`.includes("UNIQUE constraint failed")
  );
}

export class ProductService {
  constructor(private db: Db) {}

  async create(data: { name: string; price: number; barcode?: string | null }) {
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
      // Atomic: freeing the other row's barcode and restoring must not be
      // torn apart by a crash or an interleaved write. Name and barcode are
      // each unique, so `conflicts` holds at most two rows and the only
      // possible other row is the (archived) holder of data.barcode.
      return this.db.transaction((tx) => {
        const other = conflicts.find((p) => p.uuid !== archived.uuid);
        if (other) {
          tx.update(tables.products)
            .set({ barcode: null })
            .where(eq(tables.products.uuid, other.uuid))
            .run();
        }
        const [restored] = tx
          .update(tables.products)
          .set({
            name: data.name,
            price: data.price,
            barcode: data.barcode ?? archived.barcode,
            deletedAt: null,
          })
          .where(eq(tables.products.uuid, archived.uuid))
          .returning()
          .all();
        return restored;
      });
    }

    try {
      const [product] = await this.db
        .insert(tables.products)
        .values(data)
        .returning();
      return product;
    } catch (err) {
      // A racing create (or an insert the pre-check could not see) must
      // surface as the same 409 the pre-check produces, not a raw 500.
      if (isUniqueViolation(err)) {
        throw new ConflictError(
          `A product named "${data.name}" or its barcode already exists`,
        );
      }
      throw err;
    }
  }

  async getAll(includeDeleted = false) {
    return await this.db
      .select()
      .from(tables.products)
      .where(includeDeleted ? undefined : productIsActive());
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
      .where(and(eq(tables.products.barcode, barcode), productIsActive()))
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
      if (isUniqueViolation(err)) {
        throw new ConflictError(
          "Name or barcode is already in use (possibly by a deleted product)",
        );
      }
      throw err;
    }
  }

  async delete(uuid: string) {
    // Atomic: cart wipe, sold-check, and archive-or-delete commit together —
    // a crash or an interleaved write must not leave partial state.
    return this.db.transaction((tx) => {
      // The cart is transient — a deleted product leaves it either way.
      tx.delete(tables.cartItems)
        .where(eq(tables.cartItems.productUuid, uuid))
        .run();

      const sold = tx
        .select({ uuid: tables.orderItems.uuid })
        .from(tables.orderItems)
        .where(eq(tables.orderItems.productUuid, uuid))
        .limit(1)
        .get();

      if (sold) {
        // Order history references this product — archive instead of delete.
        const [archived] = tx
          .update(tables.products)
          .set({ deletedAt: new Date() })
          .where(eq(tables.products.uuid, uuid))
          .returning()
          .all();
        if (!archived) throw new NotFoundError("Product", uuid);
        return archived;
      }

      const [deleted] = tx
        .delete(tables.products)
        .where(eq(tables.products.uuid, uuid))
        .returning()
        .all();
      if (!deleted) throw new NotFoundError("Product", uuid);
      return deleted;
    });
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
