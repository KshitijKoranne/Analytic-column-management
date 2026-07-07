import type { ActivityStatus, ColumnStatus, ModuleKey } from "@/lib/types";

export const roleLabels: Record<string, string> = {
  admin: "Administrator"
};

export const permissionHumanLabels: Record<string, string> = {
  "masters:read": "View masters",
  "masters:create": "Create masters",
  "masters:update": "Update masters",
  "masters:approve": "Approve masters",
  "masters:inactivate": "Inactivate masters",
  "receipt:read": "View receipt",
  "receipt:create": "Create receipt",
  "receipt:update": "Edit receipt",
  "receipt:approve": "Approve receipt",
  "issuance:read": "View issuance",
  "issuance:create": "Create issuance",
  "performance:read": "View performance",
  "performance:create": "Create performance",
  "performance:approve": "Approve performance",
  "destruction:read": "View destruction",
  "destruction:create": "Create destruction",
  "destruction:review": "Review destruction",
  "destruction:approve": "Approve destruction",
  "reviews:read": "View reviews",
  "reports:read": "View reports",
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
  "e_signature.applied": "E-signature applied",
  "review.approved": "Review approved",
  "review.returned": "Review returned",
  "master.activated": "Master activated",
  "master.returned": "Master returned",
  "master.resubmitted": "Master resubmitted",
  "master.inactivated": "Master inactivated",
  "receipt.accepted": "Receipt accepted",
  "receipt.returned": "Receipt returned",
  "receipt.resubmitted": "Receipt resubmitted",
  "column.available": "Column available",
  "column.performance_pending": "Column awaiting performance check",
  "column.on_hold": "Column placed on hold",
  "performance.approved": "Performance approved",
  "performance.returned": "Performance returned",
  "column.destroyed": "Column destroyed",
  "destruction.returned": "Destruction returned",
  "user.created": "User created",
  "user.updated": "User updated",
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
  rejected: "Rejected",
  retired: "Inactive"
};

export const columnStatusLabels: Record<ColumnStatus, string> = {
  received_draft: "Draft",
  pending_receipt_review: "Pending receipt review",
  available: "Available (qualified)",
  issued: "Issued",
  performance_pending: "Awaiting performance check",
  on_hold: "On hold (destruction only)",
  destruction_pending: "Destruction pending",
  destroyed: "Destroyed"
};

export function humanAction(action: string) {
  return auditActionLabels[action] ?? action.replaceAll(".", " ");
}
