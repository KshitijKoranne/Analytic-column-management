import type { Permission } from "@/lib/types";

export const permissionGroups: Array<{ key: string; title: string; permissions: Permission[] }> = [
  { key: "masters", title: "Masters", permissions: ["masters:read", "masters:create", "masters:update", "masters:approve", "masters:inactivate"] },
  { key: "receipt", title: "Receipt", permissions: ["receipt:read", "receipt:create", "receipt:update", "receipt:approve"] },
  { key: "issuance", title: "Issuance", permissions: ["issuance:read", "issuance:create"] },
  { key: "performance", title: "Performance", permissions: ["performance:read", "performance:create", "performance:approve"] },
  { key: "destruction", title: "Destruction", permissions: ["destruction:read", "destruction:create", "destruction:review", "destruction:approve"] },
  { key: "reviews", title: "Reviews", permissions: ["reviews:read"] },
  { key: "reports", title: "Reports", permissions: ["reports:read"] },
  { key: "audit", title: "Audit", permissions: ["audit:read"] },
  { key: "settings", title: "Settings", permissions: ["settings:read", "settings:update"] }
];

export const permissionLabels: Record<Permission, string> = {
  "masters:read": "Read masters",
  "masters:create": "Create masters",
  "masters:update": "Update masters",
  "masters:approve": "Approve masters",
  "masters:inactivate": "Inactivate masters",
  "receipt:read": "Read receipt",
  "receipt:create": "Create receipt",
  "receipt:update": "Edit receipt",
  "receipt:approve": "Approve receipt",
  "issuance:read": "Read issuance",
  "issuance:create": "Create issuance",
  "performance:read": "Read performance",
  "performance:create": "Create performance",
  "performance:approve": "Approve performance",
  "destruction:read": "Read destruction",
  "destruction:create": "Create destruction",
  "destruction:review": "Review destruction",
  "destruction:approve": "Approve destruction",
  "reviews:read": "Read reviews",
  "reports:read": "View reports",
  "audit:read": "Read audit",
  "settings:read": "Read settings",
  "settings:update": "Update settings"
};

export const rolePermissions: Record<string, Permission[]> = {
  admin: Object.keys(permissionLabels) as Permission[]
};

const approvalConflictPairs: Array<{ label: string; create: Permission; approve: Permission }> = [
  { label: "Masters", create: "masters:create", approve: "masters:approve" },
  { label: "Receipt", create: "receipt:create", approve: "receipt:approve" },
  { label: "Performance", create: "performance:create", approve: "performance:approve" },
  { label: "Destruction technical review", create: "destruction:create", approve: "destruction:review" },
  { label: "Destruction final approval", create: "destruction:create", approve: "destruction:approve" }
];

export function workflowApprovalConflicts(permissions: string[]) {
  const selected = new Set(permissions);
  return approvalConflictPairs.filter((pair) => selected.has(pair.create) && selected.has(pair.approve)).map((pair) => pair.label);
}

export function resolvePermissions(roles: string[]): Permission[] {
  return Array.from(new Set(roles.flatMap((role) => rolePermissions[role] ?? []))).sort();
}

export function hasPermission(roles: string[], permission: Permission) {
  return resolvePermissions(roles).includes(permission);
}
