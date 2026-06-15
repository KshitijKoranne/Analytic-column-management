import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { permissionLabels, rolePermissions } from "@/lib/permissions";
import { columnMasters, permissions, rolePermissions as rolePermissionRows, roles, userRoles, users } from "@/db/schema";
import type { RoleKey } from "@/lib/types";

const roleNames: Record<RoleKey, string> = {
  admin: "Admin",
  manager: "Manager",
  analyst: "Analyst",
  reviewer: "Reviewer",
  auditor: "Auditor"
};

async function main() {
  const db = getDb();
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const [adminUser] = await db
    .insert(users)
    .values({
      name: "QC Admin",
      email,
      passwordHash,
      isActive: true
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, isActive: true, name: "QC Admin" }
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
      dimensions: "250 x 4.6 mm, 5 um",
      status: "active",
      parameterTemplate: [
        { id: "plates", label: "Theoretical plates", unit: "N", inputType: "number", required: true, lowLimit: 2000 },
        { id: "tailing", label: "Tailing factor", unit: "", inputType: "number", required: true, highLimit: 2 },
        { id: "resolution", label: "Resolution", unit: "", inputType: "number", required: true, lowLimit: 2 }
      ],
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
