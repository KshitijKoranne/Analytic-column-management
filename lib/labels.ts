import type { ActivityStatus, ModuleKey, RoleKey } from "@/lib/types";

export const roleLabels: Record<RoleKey, string> = {
  admin: "Administrator",
  manager: "Manager",
  analyst: "Analyst",
  reviewer: "Reviewer",
  auditor: "Auditor"
};

export const permissionHumanLabels: Record<string, string> = {
  "masters:read": "View masters",
  "masters:create": "Create masters",
  "masters:update": "Update masters",
  "masters:approve": "Approve masters",
  "receipt:read": "View receipt",
  "receipt:create": "Create receipt",
  "receipt:approve": "Approve receipt",
  "issuance:read": "View issuance",
  "issuance:create": "Create issuance",
  "issuance:acknowledge": "Acknowledge issuance",
  "issuance:return": "Return columns",
  "performance:read": "View performance",
  "performance:create": "Create performance",
  "performance:approve": "Approve performance",
  "destruction:read": "View destruction",
  "destruction:create": "Create destruction",
  "destruction:review": "Review destruction",
  "destruction:approve": "Approve destruction",
  "reviews:read": "View reviews",
  "audit:read": "View audit",
  "settings:read": "View settings",
  "settings:update": "Update settings"
};

export const auditActionLabels: Record<string, string> = {
  "master.submitted": "Master submitted",
  "receipt.submitted": "Receipt submitted",
  "issuance.created": "Column issued",
  "performance.recorded": "Performance recorded",
  "destruction.requested": "Destruction requested",
  "attachment.uploaded": "Attachment uploaded",
  "review.approved": "Review approved",
  "user.created": "User created",
  "role.created": "Role created",
  "role.permissions_updated": "Role rights updated",
  "role.deleted": "Role deleted"
};

export const moduleLabels: Record<ModuleKey, string> = {
  masters: "Masters",
  receipt: "Receipt",
  issuance: "Issuance",
  performance: "Performance",
  destruction: "Destruction",
  reviews: "Reviews",
  audit: "Audit",
  settings: "Settings"
};

export const statusLabels: Record<ActivityStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  accepted: "Accepted",
  issued: "Issued",
  returned: "Returned",
  recorded: "Recorded",
  on_hold: "On hold",
  approved: "Approved",
  destroyed: "Destroyed",
  rejected: "Rejected"
};

export function humanAction(action: string) {
  return auditActionLabels[action] ?? action.replaceAll(".", " ");
}
