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
    { key: "draft", label: "Prepared", requiredPermission: "issuance:create" },
    { key: "acknowledged", label: "Acknowledged", requiredPermission: "issuance:acknowledge" },
    { key: "returned", label: "Returned", requiredPermission: "issuance:return", terminal: true }
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

export function canIssueColumn(status: ColumnStatus) {
  return status === "available" || status === "issued";
}

export function canRecordPerformance(status: ColumnStatus) {
  return status === "issued" || status === "performance_pending";
}

export function canRequestDestruction(status: ColumnStatus) {
  return status === "available" || status === "on_hold" || status === "destruction_pending";
}
