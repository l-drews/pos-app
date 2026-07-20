import { eq } from "drizzle-orm";
import { type Db, tables } from "~~/server/utils/drizzle";

export class SettingsService {
  constructor(private db: Db) {}

  async get(key: string) {
    const row = await this.db
      .select()
      .from(tables.settings)
      .where(eq(tables.settings.key, key))
      .get();
    return row ?? null;
  }

  async set(key: string, value: string) {
    const [row] = await this.db
      .insert(tables.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: tables.settings.key, set: { value } })
      .returning();
    return row;
  }
}
