import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "./schema.ts";

const sqlite = new Database(process.env.DATABASE_URL ?? "./db.sqlite");
const db = drizzle(sqlite, { schema });

const adminGroupName = "Admins";
await db
  .insert(schema.groups)
  .values({ name: adminGroupName })
  .onConflictDoNothing();

const adminGroup = await db.query.groups.findFirst({
  where: eq(schema.groups.name, adminGroupName),
});

if (!adminGroup) {
  throw new Error("Admin group missing after upsert");
}

const adminBarcode = "9570007";
const existingAdmin = await db.query.users.findFirst({
  where: eq(schema.users.barcode, adminBarcode),
});

if (!existingAdmin) {
  await db.insert(schema.users).values({
    firstName: "Admin",
    lastName: "",
    birthDate: new Date("2000-01-01"),
    barcode: adminBarcode,
    balance: 0,
    groupUuid: adminGroup.uuid,
  });
}

sqlite.close();
console.log("Seed complete.");
