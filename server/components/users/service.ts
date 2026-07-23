import fs from "node:fs";
import path from "node:path";
import { desc, eq, sql } from "drizzle-orm";
import { type Db, tables } from "~~/server/utils/drizzle";
import { imagesDir } from "~~/server/utils/images";
import { generateNextUserBarcode } from "~~/server/utils/barcode";
import {
  ConflictError,
  isUniqueViolation,
  NotFoundError,
  ValidationError,
} from "~~/server/utils/errors";

interface ImageUpload {
  data: Buffer;
  ext: string;
}

/** Store an uploaded image on disk; returns the stored file name. */
function saveImage(image?: ImageUpload): string | null {
  if (!image?.data?.length) return null;
  const name = `${crypto.randomUUID()}.${image.ext}`;
  fs.writeFileSync(path.join(imagesDir(), name), image.data);
  return name;
}

function deleteImage(imagePath: string | null): void {
  if (!imagePath) return;
  try {
    fs.unlinkSync(path.join(imagesDir(), path.basename(imagePath)));
  } catch {
    // best effort — the file may already be gone
  }
}

/** Expose the stored image as the URL both dev (Nitro route) and Electron
 * (app:// protocol) serve it under. */
function withImageUrl<T extends { imagePath: string | null }>(user: T) {
  return {
    ...user,
    imageUrl: user.imagePath ? `/images/${user.imagePath}` : null,
  };
}

interface CreateUserInput {
  firstName: string;
  lastName: string;
  birthDate?: string;
  groupUuid?: string;
  barcode?: string | null;
  generateBarcode?: boolean;
  image?: ImageUpload;
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  groupUuid?: string | null;
  barcode?: string | null;
  generateBarcode?: boolean;
  image?: ImageUpload;
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
  constructor(private db: Db) {}

  async create(input: CreateUserInput) {
    let imagePath: string | null = null;
    let barcode = input.barcode;

    try {
      if (input.generateBarcode && !barcode) {
        barcode = await this.generateBarcode();
      }

      imagePath = saveImage(input.image);

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
      if (!user) throw new Error("Failed to insert user");

      return this.getByUuidWithRelations(user.uuid);
    } catch (err) {
      if (imagePath) deleteImage(imagePath);
      // The only UNIQUE column on users besides the primary key is barcode.
      if (isUniqueViolation(err)) {
        throw new ConflictError(
          `Barcode '${barcode}' is already used by another user`,
        );
      }
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
    if (input.image) {
      imagePath = saveImage(input.image);
    }

    const updateData: Record<string, unknown> = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.birthDate !== undefined)
      updateData.birthDate = new Date(input.birthDate);
    if (input.groupUuid !== undefined) updateData.groupUuid = input.groupUuid;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (imagePath !== undefined) updateData.imagePath = imagePath;

    let updated;
    try {
      [updated] = await this.db
        .update(tables.users)
        .set(updateData)
        .where(eq(tables.users.uuid, uuid))
        .returning();
    } catch (err) {
      // Don't leak the just-saved replacement image when the update fails.
      if (imagePath) deleteImage(imagePath);
      if (isUniqueViolation(err)) {
        throw new ConflictError(
          `Barcode '${barcode}' is already used by another user`,
        );
      }
      throw err;
    }
    if (!updated) throw new NotFoundError("User", uuid);

    if (imagePath !== undefined && imagePath !== existing.imagePath) {
      deleteImage(existing.imagePath);
    }

    return this.getByUuidWithRelations(updated.uuid);
  }

  async getAll() {
    const users = await this.db.query.users.findMany({ with: { group: true } });
    return users.map(withImageUrl);
  }

  async getByUuid(uuid: string) {
    // Include the group like create/update responses do — consumers (e.g.
    // the transaction dialog's user label) render it when present.
    return this.getByUuidWithRelations(uuid);
  }

  async getByBarcode(barcode: string) {
    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.barcode, barcode))
      .get();
    if (!user) throw new NotFoundError("User", barcode);
    return withImageUrl(user);
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
    const errors: string[] = [];
    let skipped = 0;

    // Each row is processed independently: a bad row is skipped and reported
    // instead of aborting the whole import (which would leave a partial result).
    for (const { data: row, line } of rows) {
      try {
        const firstName = row.firstname?.trim() ?? "";
        const lastName = row.lastname?.trim() ?? "";
        if (!firstName || !lastName) {
          skipped++;
          errors.push(`Line ${line}: missing first or last name`);
          continue;
        }

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
            if (!group) throw new Error(`Failed to create group "${row.group}"`);
          }
          groupUuid = group.uuid;
        }

        const barcode = row.barcode || undefined;
        const generateBarcode = !barcode;

        const user = await this.create({
          firstName,
          lastName,
          birthDate: row.birthdate ? parseGermanDate(row.birthdate) : undefined,
          groupUuid,
          barcode,
          generateBarcode,
        });
        users.push(user);

        // Optionally add initial balance
        if (row.amount) {
          const amountCents = parseAmountToCents(row.amount);
          if (amountCents === null) {
            // User is still imported; just flag the unparseable amount.
            errors.push(`Line ${line}: could not parse amount "${row.amount}"`);
          } else if (amountCents > 0) {
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
      } catch (err) {
        skipped++;
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Line ${line}: ${message}`);
      }
    }

    return { imported: users.length, skipped, errors, users };
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

    return withImageUrl({ ...user, group });
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
 * Parse a monetary amount string into integer cents.
 *
 * Handles both German ("12,50", "1.234,56") and English ("12.50", "1,234.56")
 * number formats, plus surrounding whitespace/currency symbols. When both ","
 * and "." appear, the right-most one is the decimal separator. When only one
 * kind of separator appears and it is followed by exactly 3 digits, it is a
 * thousands grouping ("1.234" and "1,234" both mean 1234 in their respective
 * locales — money amounts don't have 3 decimals); otherwise it is the decimal
 * separator. Returns null for non-numeric input.
 *
 * The previous `parseFloat` approach silently dropped the fractional part of
 * German-formatted amounts (e.g. "12,50" -> 12 -> €12.00 instead of €12.50).
 */
function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^\d.,-]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalPos = Math.max(lastComma, lastDot);
  let normalized: string;
  if (decimalPos === -1) {
    normalized = cleaned;
  } else if (
    (lastComma === -1 || lastDot === -1) &&
    cleaned.length - decimalPos - 1 === 3
  ) {
    normalized = cleaned.replace(/[.,]/g, "");
  } else {
    const intPart = cleaned.slice(0, decimalPos).replace(/[.,]/g, "");
    const fracPart = cleaned.slice(decimalPos + 1).replace(/[.,]/g, "");
    normalized = `${intPart}.${fracPart}`;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/**
 * Parse German date "dd.mm.yy" to ISO string, or return as-is for other formats.
 */
function parseGermanDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (match) {
    const [, dayRaw, monthRaw, yearRaw] = match as [string, string, string, string];
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");
    let year = parseInt(yearRaw, 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

/**
 * Parse a semicolon-delimited CSV string into rows, keeping each row's 1-based
 * source line number for error reporting. A leading UTF-8 BOM (added by Excel
 * and similar tools) is stripped so the first header still matches.
 * Expected columns: firstname, lastname, birthdate, group?, barcode?, amount?
 */
function parseCsv(content: string): Array<{ data: CsvRow; line: number }> {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerLine = lines[0];
  if (!headerLine) return [];

  const headers = headerLine.split(";").map((h) => h.trim().toLowerCase());

  const rows: Array<{ data: CsvRow; line: number }> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const values = line.split(";");
    const row: Record<string, string> = {};
    headers.forEach((header, j) => {
      row[header] = values[j]?.trim() ?? "";
    });
    rows.push({ data: row as unknown as CsvRow, line: i + 1 });
  }
  return rows;
}
