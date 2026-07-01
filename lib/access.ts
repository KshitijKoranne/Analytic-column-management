import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { permissions, rolePermissions, roles, userRoles, users } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import { hasPermission, resolvePermissions } from "@/lib/permissions";
import type { Permission } from "@/lib/types";

export type AccessContext = {
  id: string;
  name?: string | null;
  email?: string | null;
  roles: string[];
  permissions: Permission[];
};

export async function getAccessContext(permission?: Permission): Promise<AccessContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (hasDatabase()) {
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.isActive) redirect("/login");

    const assignedRoles = await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, user.id));
    const roleIds = assignedRoles.map((role) => role.roleId);
    const roleRows = roleIds.length ? await db.select({ key: roles.key }).from(roles).where(inArray(roles.id, roleIds)) : [];
    const permissionRows = roleIds.length
      ? await db
          .select({ key: permissions.key })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(inArray(rolePermissions.roleId, roleIds))
      : [];

    const grantedPermissions = Array.from(new Set(permissionRows.map((row) => row.key))) as Permission[];
    if (permission && !grantedPermissions.includes(permission)) {
      redirect("/dashboard");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: roleRows.map((role) => role.key),
      permissions: grantedPermissions
    };
  }

  const rolesFromSession = session.user.roles ?? [session.user.role ?? "admin"];
  const seededPermissions = resolvePermissions(rolesFromSession);
  const jwtPermissions = (session.user.permissions ?? []) as Permission[];
  const grantedPermissions = jwtPermissions.includes("*" as Permission) ? (["*" as Permission] as Permission[]) : seededPermissions;

  if (permission && !jwtPermissions.includes("*" as Permission) && !hasPermission(rolesFromSession, permission)) {
    redirect("/dashboard");
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles: rolesFromSession,
    permissions: grantedPermissions
  };
}

export async function requirePermission(permission: Permission) {
  return getAccessContext(permission);
}

export function canAccess(context: AccessContext, permission: Permission) {
  return context.permissions.includes("*" as Permission) || context.permissions.includes(permission);
}
