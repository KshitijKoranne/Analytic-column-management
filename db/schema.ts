import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const activityStatusEnum = pgEnum("activity_status", [
  "draft",
  "pending_review",
  "accepted",
  "issued",
  "returned",
  "recorded",
  "on_hold",
  "approved",
  "destroyed",
  "rejected"
]);

export const columnStatusEnum = pgEnum("column_status", [
  "received_draft",
  "pending_receipt_review",
  "available",
  "issued",
  "performance_pending",
  "on_hold",
  "destruction_pending",
  "destroyed"
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId]
    })
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull()
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull()
  },
  (token) => ({
    compoundKey: primaryKey({ columns: [token.identifier, token.token] })
  })
);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  resource: text("resource").notNull(),
  action: text("action").notNull()
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] })
  })
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] })
  })
);

export const columnMasters = pgTable("column_masters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  columnType: text("column_type").notNull(),
  manufacturer: text("manufacturer").notNull(),
  partNumber: text("part_number").notNull(),
  dimensions: text("dimensions").notNull(),
  status: text("status").notNull().default("draft"),
  parameterTemplate: jsonb("parameter_template").notNull().default([]),
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const columnUnits = pgTable("column_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetCode: text("asset_code").notNull().unique(),
  serialNumber: text("serial_number").notNull(),
  masterId: uuid("master_id")
    .notNull()
    .references(() => columnMasters.id),
  status: columnStatusEnum("status").notNull().default("received_draft"),
  currentHolderId: text("current_holder_id").references(() => users.id),
  storageLocation: text("storage_location").notNull(),
  receivedAt: timestamp("received_at", { mode: "date" }),
  destroyedAt: timestamp("destroyed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  columnUnitId: uuid("column_unit_id").references(() => columnUnits.id),
  columnMasterId: uuid("column_master_id").references(() => columnMasters.id),
  supplier: text("supplier").notNull(),
  serialNumber: text("serial_number").notNull(),
  receivedDate: timestamp("received_date", { mode: "date" }).notNull(),
  storageLocation: text("storage_location").notNull(),
  condition: text("condition").notNull(),
  status: activityStatusEnum("status").notNull().default("draft"),
  remarks: text("remarks"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const issuances = pgTable("issuances", {
  id: uuid("id").defaultRandom().primaryKey(),
  columnUnitId: uuid("column_unit_id")
    .notNull()
    .references(() => columnUnits.id),
  issueToId: text("issue_to_id").references(() => users.id),
  issueDate: timestamp("issue_date", { mode: "date" }).notNull(),
  expectedReturnDate: timestamp("expected_return_date", { mode: "date" }).notNull(),
  returnedAt: timestamp("returned_at", { mode: "date" }),
  purpose: text("purpose").notNull(),
  status: activityStatusEnum("status").notNull().default("draft"),
  remarks: text("remarks"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const performanceEntries = pgTable("performance_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  columnUnitId: uuid("column_unit_id")
    .notNull()
    .references(() => columnUnits.id),
  issuanceId: uuid("issuance_id").references(() => issuances.id),
  method: text("method").notNull(),
  performedDate: timestamp("performed_date", { mode: "date" }).notNull(),
  values: jsonb("values").notNull().default({}),
  result: text("result").notNull(),
  status: activityStatusEnum("status").notNull().default("recorded"),
  remarks: text("remarks"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const destructions = pgTable("destructions", {
  id: uuid("id").defaultRandom().primaryKey(),
  columnUnitId: uuid("column_unit_id")
    .notNull()
    .references(() => columnUnits.id),
  reason: text("reason").notNull(),
  requestedDate: timestamp("requested_date", { mode: "date" }).notNull(),
  disposalMethod: text("disposal_method").notNull(),
  reviewerApprovedBy: text("reviewer_approved_by").references(() => users.id),
  managerApprovedBy: text("manager_approved_by").references(() => users.id),
  destroyedAt: timestamp("destroyed_at", { mode: "date" }),
  status: activityStatusEnum("status").notNull().default("pending_review"),
  remarks: text("remarks").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  graph: jsonb("graph").notNull().default({ nodes: [], edges: [] }),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  definitionId: uuid("definition_id").references(() => workflowDefinitions.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  currentStep: text("current_step").notNull(),
  status: text("status").notNull().default("open"),
  startedBy: text("started_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const approvalTasks = pgTable("approval_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  module: text("module").notNull(),
  step: text("step").notNull(),
  status: text("status").notNull().default("pending"),
  assignedPermission: text("assigned_permission").notNull(),
  requestedBy: text("requested_by").references(() => users.id),
  completedBy: text("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});
