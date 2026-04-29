import { eq, sql } from "drizzle-orm";
import { type Db, type Tx, tables } from "~~/server/utils/drizzle";
import { NotFoundError, ValidationError } from "~~/server/utils/errors";

function formatCentsAsEUR(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export class TransactionService {
  constructor(private db: Db) {}

  async create(amount: number, userUuid: string) {
    return this.db.transaction((txn) => {
      return this.createCreditTransaction(txn, amount, userUuid);
    });
  }

  /**
   * Create a credit transaction within an existing DB transaction.
   * Positive amount = deposit, negative amount = withdrawal.
   * Throws if the resulting balance would be negative.
   *
   * NOTE: Callback is sync because better-sqlite3 transactions are synchronous.
   */
  createCreditTransaction(txn: Tx, amount: number, userUuid: string) {
    const users = txn
      .update(tables.users)
      .set({ balance: sql`${tables.users.balance} + ${amount}` })
      .where(eq(tables.users.uuid, userUuid))
      .returning()
      .all();

    const user = users[0];
    if (!user) throw new NotFoundError("User", userUuid);

    if (user.balance < 0) {
      throw new ValidationError(
        `Insufficient balance. Current: ${formatCentsAsEUR(user.balance - amount)}, ` +
          `required: ${formatCentsAsEUR(-amount)}`,
      );
    }

    const txnRows = txn
      .insert(tables.transactions)
      .values({ userUuid, amount })
      .returning()
      .all();
    const [txnRow] = txnRows;
    if (!txnRow) throw new Error("Failed to insert transaction");

    return { ...txnRow, user };
  }

  async getAll() {
    return this.db.query.transactions.findMany({
      with: {
        user: true,
        order: true,
      },
    });
  }
}
