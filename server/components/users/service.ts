import { desc, eq, sql } from "drizzle-orm";
import { type db, type tx, tables } from "~~/server/utils/drizzle";
import { generateNextUserBarcode } from "~~/server/utils/barcode";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "~~/server/utils/errors";

// Image upload stub — replace with real implementation when ready
function saveImage(_buffer?: Buffer): string | null {
  return null;
}
function deleteImage(_imagePath: string | null): void {
  // no-op stub
}

interface CreateUserInput {
  firstName: string;
  lastName: string;
  birthDate?: string;
  groupUuid?: string;
  barcode?: string;
  generateBarcode?: boolean;
  file?: Buffer;
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  groupUuid?: string | null;
  barcode?: string | null;
  generateBarcode?: boolean;
  file?: Buffer;
}

interface CsvRow {
  firstname: string;
  lastname: string;
  birthdate: string;
  group?: string;
  barcode?: string;
  amount?: string;
}

export class UserService {
  constructor(private db: db) {}

  async create(input: CreateUserInput) {
    let imagePath: string | null = null;

    try {
      let barcode = input.barcode;
      if (input.generateBarcode && !barcode) {
        barcode = await this.generateBarcode();
      }

      imagePath = saveImage(input.file);

      const [user] = await this.db
        .insert(tables.users)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          birthDate: input.birthDate ? new Date(input.birthDate) : new Date(0),
          groupUuid: input.groupUuid,
          barcode,
          imagePath,
        })
        .returning();

      return this.getByUuidWithRelations(user.uuid);
    } catch (err) {
      if (imagePath) deleteImage(imagePath);
      throw err;
    }
  }

  async update(uuid: string, input: UpdateUserInput) {
    const existing = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.uuid, uuid))
      .get();
    if (!existing) throw new NotFoundError("User", uuid);

    let barcode = input.barcode;
    if (input.generateBarcode && barcode === undefined) {
      barcode = await this.generateBarcode();
    }

    let imagePath: string | null | undefined;
    if (input.file) {
      imagePath = saveImage(input.file);
    }

    const updateData: Record<string, unknown> = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.birthDate !== undefined)
      updateData.birthDate = new Date(input.birthDate);
    if (input.groupUuid !== undefined) updateData.groupUuid = input.groupUuid;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (imagePath !== undefined) updateData.imagePath = imagePath;

    const [updated] = await this.db
      .update(tables.users)
      .set(updateData)
      .where(eq(tables.users.uuid, uuid))
      .returning();

    // Clean up old image if changed
    if (imagePath !== undefined && imagePath !== existing.imagePath) {
      deleteImage(existing.imagePath);
    }

    return this.getByUuidWithRelations(updated.uuid);
  }

  async getAll() {
    return this.db.select().from(tables.users);
  }

  async getByUuid(uuid: string) {
    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.uuid, uuid))
      .get();
    if (!user) throw new NotFoundError("User", uuid);
    return user;
  }

  async getByBarcode(barcode: string) {
    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.barcode, barcode))
      .get();
    if (!user) throw new NotFoundError("User", barcode);
    return user;
  }

  async delete(uuid: string) {
    return this.db.transaction((tx) => {
      const user = tx
        .select()
        .from(tables.users)
        .where(eq(tables.users.uuid, uuid))
        .get();

      if (!user) throw new NotFoundError("User", uuid);
      if (user.balance !== 0) {
        throw new ConflictError(
          "Account can't be deleted. Cause: account balance not 0.",
        );
      }

      // Cascade delete: orderItems → orders → transactions → user
      const userOrders = tx
        .select()
        .from(tables.orders)
        .where(eq(tables.orders.userUuid, uuid))
        .all();

      for (const order of userOrders) {
        tx.delete(tables.orderItems)
          .where(eq(tables.orderItems.orderUuid, order.uuid))
          .run();
        tx.delete(tables.orders).where(eq(tables.orders.uuid, order.uuid)).run();
      }

      tx.delete(tables.transactions)
        .where(eq(tables.transactions.userUuid, uuid))
        .run();

      tx.delete(tables.users).where(eq(tables.users.uuid, uuid)).run();

      deleteImage(user.imagePath);

      return user;
    });
  }

  async importCsv(csvContent: string) {
    const rows = parseCsv(csvContent);
    const users = [];

    for (const row of rows) {
      // Find or create group
      let groupUuid: string | undefined;
      if (row.group) {
        let group = await this.db
          .select()
          .from(tables.groups)
          .where(eq(tables.groups.name, row.group))
          .get();

        if (!group) {
          [group] = await this.db
            .insert(tables.groups)
            .values({ name: row.group })
            .returning();
        }
        groupUuid = group.uuid;
      }

      const barcode = row.barcode || undefined;
      const generateBarcode = !barcode;

      const user = await this.create({
        firstName: row.firstname,
        lastName: row.lastname,
        birthDate: row.birthdate ? parseGermanDate(row.birthdate) : undefined,
        groupUuid,
        barcode,
        generateBarcode,
      });
      users.push(user);

      // Optionally add initial balance
      if (row.amount) {
        const amountCents = Math.round(parseFloat(row.amount) * 100);
        if (amountCents > 0) {
          this.db.transaction((tx) => {
            tx.update(tables.users)
              .set({ balance: sql`${tables.users.balance} + ${amountCents}` })
              .where(eq(tables.users.uuid, user.uuid))
              .run();
            tx.insert(tables.transactions)
              .values({ userUuid: user.uuid, amount: amountCents })
              .run();
          });
        }
      }
    }

    return { imported: users.length, skipped: 0, users };
  }

  private async getByUuidWithRelations(uuid: string) {
    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.uuid, uuid))
      .get();

    if (!user) throw new NotFoundError("User", uuid);

    const group = user.groupUuid
      ? await this.db
          .select()
          .from(tables.groups)
          .where(eq(tables.groups.uuid, user.groupUuid))
          .get()
      : null;

    return { ...user, group };
  }

  private async generateBarcode(): Promise<string> {
    const topUser = await this.db
      .select({ barcode: tables.users.barcode })
      .from(tables.users)
      .orderBy(desc(tables.users.barcode))
      .limit(1)
      .get();

    return generateNextUserBarcode(topUser?.barcode ?? null);
  }
}

/**
 * Parse German date "dd.mm.yy" to ISO string, or return as-is for other formats.
 */
function parseGermanDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    let year = parseInt(match[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

/**
 * Parse a semicolon-delimited CSV string into rows.
 * Expected columns: firstname, lastname, birthdate, group?, barcode?, amount?
 */
function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(";").map((h) => h.trim().toLowerCase());

  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(";");
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() ?? "";
    });
    return row as unknown as CsvRow;
  });
}
