import { eq } from "drizzle-orm";
import { type db, tables } from "~~/server/utils/drizzle";
import { ValidationError } from "~~/server/utils/errors";
import { TransactionService } from "~~/server/components/transactions/service";

export class OrderService {
  constructor(
    private db: db,
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
      const order = orderRows[0];

      // 5. Create order items
      const orderItems = cartWithProducts.map((item) => {
        const rows = tx
          .insert(tables.orderItems)
          .values({
            orderUuid: order.uuid,
            productUuid: item.productUuid,
            count: item.count,
            amount: item.product.price * item.count,
          })
          .returning()
          .all();
        return rows[0];
      });

      // 6. Clear cart
      tx.delete(tables.cartItems).run();

      return { ...order, items: orderItems, user: txnResult.user };
    });
  }

  async getAll() {
    return this.db.query.orders.findMany({
      with: {
        user: true,
        items: true,
      },
    });
  }
}
