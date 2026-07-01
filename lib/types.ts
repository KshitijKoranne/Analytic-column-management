export type ModuleKey =
  | "masters"
  | "receipt"
  | "issuance"
  | "performance"
  | "destruction"
  | "reviews"
  | "audit"
  | "settings";

export type ActivityStatus =
  | "draft"
  | "pending_review"
  | "accepted"
  | "issued"
  | "returned"
  | "recorded"
  | "on_hold"
  | "approved"
  | "destroyed"
  | "rejected";

export type ColumnStatus =
  | "received_draft"
  | "pending_receipt_review"
  | "available"
  | "issued"
  | "performance_pending"
  | "on_hold"
  | "destruction_pending"
  | "destroyed";

export type Permission =
  | "masters:read"
  | "masters:create"
  | "masters:update"
  | "masters:approve"
  | "receipt:read"
  | "receipt:create"
  | "receipt:approve"
  | "issuance:read"
  | "issuance:create"
  | "performance:read"
  | "performance:create"
  | "performance:approve"
  | "destruction:read"
  | "destruction:create"
  | "destruction:review"
  | "destruction:approve"
  | "reviews:read"
  | "audit:read"
  | "settings:read"
  | "settings:update";

export type RoleKey = "admin";

export type AttachmentMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type ActivityRecord = {
  id: string;
  module: ModuleKey;
  title: string;
  subtitle: string;
  status: ActivityStatus;
  statusLabel?: string;
  owner: string;
  date: string;
  columnId?: string;
  masterName?: string;
  detailRows?: Array<{ label: string; value: string }>;
  detailActionHref?: string;
  detailActionLabel?: string;
  attachments: AttachmentMeta[];
};

export type ColumnMaster = {
  id: string;
  name: string;
  columnType: string;
  manufacturer: string;
  partNumber: string;
  lengthValue?: string;
  lengthUnit?: string;
  diameterValue?: string;
  diameterUnit?: string;
  particleSizeValue?: string;
  particleSizeUnit?: string;
  packing?: string;
  dimensions: string;
  status: "draft" | "pending_review" | "active" | "superseded" | "retired";
  createdAt?: string;
  parameterTemplate: PerformanceParameter[];
};

export type PerformanceParameter = {
  id: string;
  label: string;
  unit: string;
  inputType: "number" | "select" | "text" | "checkbox";
  required: boolean;
  lowLimit?: number;
  highLimit?: number;
  options?: string[];
};

export type ColumnUnit = {
  id: string;
  assetCode: string;
  serialNumber: string;
  masterId: string;
  status: ColumnStatus;
  currentHolder: string;
  storageLocation: string;
  dedicatedProduct?: string;
  dedicatedTest?: string;
  receivedAt: string;
};

export type ReviewItem = {
  id: string;
  module: ModuleKey;
  recordId: string;
  title: string;
  requestedBy: string;
  step: string;
  due: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  at: string;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};
