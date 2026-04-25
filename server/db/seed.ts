import { randomBytes, scryptSync } from "node:crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "./schema.ts";

// Placeholder password hashing — replace once an AuthenticationService is ported.
function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const sqlite = new Database(process.env.DATABASE_URL ?? "./db.sqlite");
const db = drizzle(sqlite, { schema });

const roleNames = ["Admin", "LaKi", "Teamer*in"] as const;
for (const name of roleNames) {
  await db.insert(schema.roles).values({ name }).onConflictDoNothing();
}

const adminGroupName = "Admins";
await db
  .insert(schema.groups)
  .values({ name: adminGroupName })
  .onConflictDoNothing();

const adminRole = await db.query.roles.findFirst({
  where: eq(schema.roles.name, "Admin"),
});
const adminGroup = await db.query.groups.findFirst({
  where: eq(schema.groups.name, adminGroupName),
});

if (!adminRole || !adminGroup) {
  throw new Error("Admin role or group missing after upsert");
}

const adminBarcode = "9570007";
let adminUser = await db.query.users.findFirst({
  where: eq(schema.users.barcode, adminBarcode),
});

if (!adminUser) {
  const [inserted] = await db
    .insert(schema.users)
    .values({
      firstName: "Admin",
      lastName: "",
      birthDate: new Date("2000-01-01"),
      barcode: adminBarcode,
      balance: 0,
      roleUuid: adminRole.uuid,
      groupUuid: adminGroup.uuid,
    })
    .returning();
  adminUser = inserted;
}

await db
  .insert(schema.userLogins)
  .values({
    userUuid: adminUser.uuid,
    username: "admin",
    password: hashPassword("admin"),
  })
  .onConflictDoNothing();

sqlite.close();
console.log("Seed complete.");
