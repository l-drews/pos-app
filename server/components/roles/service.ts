import { eq } from "drizzle-orm";
import { type db, tables } from "~~/server/utils/drizzle";
import { ConflictError, NotFoundError } from "~~/server/utils/errors";

export class RoleService {
  constructor(private db: db) {}

  async create(data: { name: string }) {
    const [role] = await this.db
      .insert(tables.roles)
      .values(data)
      .returning();
    return role;
  }

  async getAll() {
    const allRoles = await this.db.select().from(tables.roles);
    const result = [];
    for (const role of allRoles) {
      const members = await this.db
        .select({ uuid: tables.users.uuid })
        .from(tables.users)
        .where(eq(tables.users.roleUuid, role.uuid));
      result.push({ ...role, users: members });
    }
    return result;
  }

  async getByUuid(uuid: string) {
    const role = await this.db
      .select()
      .from(tables.roles)
      .where(eq(tables.roles.uuid, uuid))
      .get();
    if (!role) throw new NotFoundError("Role", uuid);

    const members = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.roleUuid, uuid));

    return { ...role, users: members };
  }

  async update(uuid: string, data: { name?: string }) {
    const [updated] = await this.db
      .update(tables.roles)
      .set(data)
      .where(eq(tables.roles.uuid, uuid))
      .returning();
    if (!updated) throw new NotFoundError("Role", uuid);
    return updated;
  }

  async delete(uuid: string) {
    const usersWithRole = await this.db
      .select({ uuid: tables.users.uuid })
      .from(tables.users)
      .where(eq(tables.users.roleUuid, uuid));

    if (usersWithRole.length > 0) {
      throw new ConflictError(
        "Cannot delete role: users are still assigned to it",
      );
    }

    const [deleted] = await this.db
      .delete(tables.roles)
      .where(eq(tables.roles.uuid, uuid))
      .returning();
    if (!deleted) throw new NotFoundError("Role", uuid);
    return deleted;
  }
}
