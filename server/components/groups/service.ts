import { eq } from "drizzle-orm";
import { type Db, tables } from "~~/server/utils/drizzle";
import { NotFoundError } from "~~/server/utils/errors";

export class GroupService {
  constructor(private db: Db) {}

  async create(data: { name: string }) {
    const [group] = await this.db
      .insert(tables.groups)
      .values(data)
      .returning();
    return group;
  }

  async getAll() {
    return await this.db.select().from(tables.groups);
  }

  async getByUuid(uuid: string) {
    const group = await this.db
      .select()
      .from(tables.groups)
      .where(eq(tables.groups.uuid, uuid))
      .get();
    if (!group) throw new NotFoundError("Group", uuid);

    const members = await this.db
      .select({ uuid: tables.users.uuid })
      .from(tables.users)
      .where(eq(tables.users.groupUuid, uuid));

    return { ...group, users: members };
  }

  async update(uuid: string, data: { name?: string }) {
    const [updated] = await this.db
      .update(tables.groups)
      .set(data)
      .where(eq(tables.groups.uuid, uuid))
      .returning();
    if (!updated) throw new NotFoundError("Group", uuid);
    return updated;
  }

  async delete(uuid: string) {
    const [deleted] = await this.db
      .delete(tables.groups)
      .where(eq(tables.groups.uuid, uuid))
      .returning();
    if (!deleted) throw new NotFoundError("Group", uuid);
    return deleted;
  }
}
