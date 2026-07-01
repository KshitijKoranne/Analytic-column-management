import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { permissionLabels, rolePermissions } from "@/lib/permissions";
import { columnMasters, permissions, rolePermissions as rolePermissionRows, roles, userRoles, users } from "@/db/schema";
import type { RoleKey } from "@/lib/types";

const roleNames: Record<RoleKey, string> = {
  admin: "Admin"
};

async function main() {
  const db = getDb();
  const isProduction = process.env.NODE_ENV === "production";
  const email = process.env.SEED_ADMIN_EMAIL ?? (isProduction ? "" : "admin@example.com");
  const password = process.env.SEED_ADMIN_PASSWORD ?? (isProduction ? "" : "ChangeMe123!");
  const resetExistingPassword = process.env.SEED_RESET_ADMIN_PASSWORD === "true";

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existingAdmin = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  const [adminUser] = existingAdmin
    ? await db
        .update(users)
        .set({
          name: existingAdmin.name ?? "QC Admin",
          isActive: true,
          ...(resetExistingPassword ? { passwordHash } : {})
        })
        .where(eq(users.id, existingAdmin.id))
        .returning()
    : await db
    .insert(users)
    .values({
      name: "QC Admin",
      email,
      passwordHash,
      isActive: true
    })
    .returning();

  const permissionRows = [];
  for (const key of Object.keys(permissionLabels)) {
    const [resource, action] = key.split(":");
    const [permission] = await db
      .insert(permissions)
      .values({ key, resource, action })
      .onConflictDoNothing()
      .returning();
    permissionRows.push(permission);
  }

  for (const roleKey of Object.keys(roleNames) as RoleKey[]) {
    const [role] = await db
      .insert(roles)
      .values({ key: roleKey, name: roleNames[roleKey], isSystem: true })
      .onConflictDoNothing()
      .returning();

    const existingRole = role ?? (await db.select().from(roles).where(eq(roles.key, roleKey)).limit(1))[0];
    if (!existingRole) continue;

    if (roleKey === "admin") {
      await db.insert(userRoles).values({ userId: adminUser.id, roleId: existingRole.id }).onConflictDoNothing();
    }

    for (const permissionKey of rolePermissions[roleKey]) {
      const permission =
        permissionRows.find((row) => row?.key === permissionKey) ??
        (await db.select().from(permissions).where(eq(permissions.key, permissionKey)).limit(1))[0];
      if (permission) {
        await db
          .insert(rolePermissionRows)
          .values({ roleId: existingRole.id, permissionId: permission.id })
          .onConflictDoNothing();
      }
    }
  }

  await db
    .insert(columnMasters)
    .values({
      name: "C18 Assay Column",
      columnType: "HPLC",
      manufacturer: "Waters",
      partNumber: "186003062",
      lengthValue: "250",
      lengthUnit: "mm",
      diameterValue: "4.6",
      diameterUnit: "mm",
      particleSizeValue: "5",
      particleSizeUnit: "micron",
      packing: "Silica C18",
      dimensions: "Length: 250 mm · Diameter: 4.6 mm · Particle: 5 micron",
      status: "active",
      parameterTemplate: [],
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    })
    .onConflictDoNothing();

  console.log(`Seeded ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
