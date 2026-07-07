import type { ColumnStatus, ModuleKey } from "@/lib/types";

export type WorkflowStep = {
  key: string;
  label: string;
  requiredPermission: string;
  terminal?: boolean;
};

export const defaultWorkflows: Record<Exclude<ModuleKey, "reviews" | "audit" | "settings">, WorkflowStep[]> = {
  masters: [
    { key: "draft", label: "Draft", requiredPermission: "masters:create" },
    { key: "pending_review", label: "Review", requiredPermission: "masters:approve" },
    { key: "active", label: "Active", requiredPermission: "masters:approve", terminal: true }
  ],
  receipt: [
    { key: "draft", label: "Draft", requiredPermission: "receipt:create" },
    { key: "pending_review", label: "Review", requiredPermission: "receipt:approve" },
    { key: "accepted", label: "Accepted", requiredPermission: "receipt:approve", terminal: true }
  ],
  issuance: [
    { key: "available", label: "Ready", requiredPermission: "issuance:create" },
    { key: "issued", label: "Issued", requiredPermission: "issuance:create", terminal: true }
  ],
  performance: [
    { key: "recorded", label: "Recorded", requiredPermission: "performance:create" },
    { key: "review", label: "Review", requiredPermission: "performance:approve" },
    { key: "accepted", label: "Accepted", requiredPermission: "performance:approve", terminal: true }
  ],
  destruction: [
    { key: "requested", label: "Requested", requiredPermission: "destruction:create" },
    { key: "reviewed", label: "Reviewed", requiredPermission: "destruction:review" },
    { key: "approved", label: "Approved", requiredPermission: "destruction:approve" },
    { key: "destroyed", label: "Destroyed", requiredPermission: "destruction:approve", terminal: true }
  ]
};

// Column lifecycle gate (client requirement):
//   accepted (intact)  -> performance_pending  (must be performance-qualified before use)
//   performance PASS    -> available            (qualified, ready to issue)
//   performance FAIL /
//   accepted (damaged)  -> on_hold              (unusable — destruction only)
//   available           -> issued               (stays issued until destroyed; no take-back)
// A column can only be issued once it has passed a performance check, and a damaged/failed
// column can never be issued or (re)tested — only sent for destruction.
export function canIssueColumn(status: ColumnStatus) {
  return status === "available";
}

export function canRecordPerformance(status: ColumnStatus) {
  return status === "performance_pending";
}

export function canRequestDestruction(status: ColumnStatus) {
  return status === "performance_pending" || status === "available" || status === "issued" || status === "on_hold";
}
