import type { Permission, RoleKey } from "@/lib/types";

export const permissionLabels: Record<Permission, string> = {
  "masters:read": "Read masters",
  "masters:create": "Create masters",
  "masters:update": "Update masters",
  "masters:approve": "Approve masters",
  "receipt:read": "Read receipt",
  "receipt:create": "Create receipt",
  "receipt:approve": "Approve receipt",
  "issuance:read": "Read issuance",
  "issuance:create": "Create issuance",
  "issuance:acknowledge": "Acknowledge issuance",
  "issuance:return": "Return columns",
  "performance:read": "Read performance",
  "performance:create": "Create performance",
  "performance:approve": "Approve performance",
  "destruction:read": "Read destruction",
  "destruction:create": "Create destruction",
  "destruction:review": "Review destruction",
  "destruction:approve": "Approve destruction",
  "reviews:read": "Read reviews",
  "audit:read": "Read audit",
  "settings:read": "Read settings",
  "settings:update": "Update settings"
};

export const rolePermissions: Record<RoleKey, Permission[]> = {
  admin: Object.keys(permissionLabels) as Permission[],
  manager: [
    "masters:read",
    "receipt:read",
    "issuance:read",
    "performance:read",
    "destruction:read",
    "destruction:approve",
    "reviews:read",
    "audit:read",
    "settings:read"
  ],
  analyst: [
    "masters:read",
    "receipt:read",
    "receipt:create",
    "issuance:read",
    "issuance:create",
    "issuance:acknowledge",
    "issuance:return",
    "performance:read",
    "performance:create",
    "destruction:read",
    "destruction:create"
  ],
  reviewer: [
    "masters:read",
    "masters:approve",
    "receipt:read",
    "receipt:approve",
    "issuance:read",
    "performance:read",
    "performance:approve",
    "destruction:read",
    "destruction:review",
    "reviews:read",
    "audit:read"
  ],
  auditor: ["masters:read", "receipt:read", "issuance:read", "performance:read", "destruction:read", "reviews:read", "audit:read"]
};

export function resolvePermissions(roles: RoleKey[]): Permission[] {
  return Array.from(new Set(roles.flatMap((role) => rolePermissions[role] ?? []))).sort();
}

export function hasPermission(roles: RoleKey[], permission: Permission) {
  return resolvePermissions(roles).includes(permission);
}
