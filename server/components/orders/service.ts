import { asc, count, desc, eq } from "drizzle-orm";
import { type Db, tables } from "~~/server/utils/drizzle";
import { ValidationError } from "~~/server/utils/errors";
import { TransactionService } from "~~/server/components/transactions/service";

export class OrderService {
  constructor(
    private db: Db,
    private transactionService: TransactionService,
  ) {}

  async create(userUuid: string) {
    return this.db.transaction((tx) => {
      // 1. Fetch cart items with their products
      const items = tx.select().from(tables.cartItems).all();
      if (items.length === 0) {
        throw new ValidationError("Cart is empty");
      }

      const cartWithProducts = items.map((item) => {
        const product = tx
          .select()
          .from(tables.products)
          .where(eq(tables.products.uuid, item.productUuid))
          .get();
        return { ...item, product: product! };
      });

      // 2. Compute total (integer cents arithmetic)
      const totalAmount = cartWithProducts.reduce(
        (sum, item) => sum + item.product.price * item.count,
        0,
      );

      // 3. Create debit transaction (negative = withdrawal)
      const txnResult = this.transactionService.createCreditTransaction(
        tx,
        -totalAmount,
        userUuid,
      );

      // 4. Create order
      const orderRows = tx
        .insert(tables.orders)
        .values({
          userUuid,
          amount: totalAmount,
          transactionUuid: txnResult.uuid,
        })
        .returning()
        .all();
      const [order] = orderRows;
      if (!order) throw new Error("Failed to insert order");

      // 5. Create order items
      const orderItems = cartWithProducts.map((item) => {
        const [row] = tx
          .insert(tables.orderItems)
          .values({
            orderUuid: order.uuid,
            productUuid: item.productUuid,
            count: item.count,
            amount: item.product.price * item.count,
          })
          .returning()
          .all();
        if (!row) throw new Error("Failed to insert order item");
        return row;
      });

      // 6. Clear cart
      tx.delete(tables.cartItems).run();

      return { ...order, items: orderItems, user: txnResult.user };
    });
  }

  // Lean list of all orders (columns only) for aggregations like the shop's
  // daily total and the summary page. The paginated `list` is for the UI table.
  async getAll() {
    return this.db.query.orders.findMany();
  }

  async list(
    limit: number,
    offset: number,
    sortBy: "createdAt" | "amount" = "createdAt",
    sortDir: "asc" | "desc" = "desc",
  ) {
    const column =
      sortBy === "amount" ? tables.orders.amount : tables.orders.createdAt;
    const direction = sortDir === "asc" ? asc : desc;
    const rows = await this.db.query.orders.findMany({
      with: {
        user: true,
        items: { with: { product: true } },
      },
      orderBy: direction(column),
      limit,
      offset,
    });
    const total = this.db.select({ value: count() }).from(tables.orders).get();
    return { rows, total: total?.value ?? 0 };
  }

  async getByUser(userUuid: string) {
    return this.db.query.orders.findMany({
      where: eq(tables.orders.userUuid, userUuid),
      with: {
        items: { with: { product: true } },
      },
      orderBy: desc(tables.orders.createdAt),
    });
  }
}
