import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import {
  appSettings,
  approvalTasks,
  auditEvents as auditEventsTable,
  columnMasters as columnMastersTable,
  columnUnits,
  issuances,
  permissions,
  performanceEntries,
  receipts,
  rolePermissions,
  roles,
  destructions,
  userRoles,
  users
} from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import {
  activityRecords,
  auditEvents,
  columnMasters,
  columnUnits as sampleColumns,
  personnel,
  reviewItems
} from "@/lib/sample-data";
import type { ActivityRecord, ActivityStatus, AuditEvent, ColumnMaster, ColumnStatus, ColumnUnit, ModuleKey, Permission, ReceiptFormRecord, ReviewItem } from "@/lib/types";
import type { ReportRow } from "@/lib/reports";
import { columnStatusLabels, permissionHumanLabels, roleLabels, statusLabels } from "@/lib/labels";
import { rolePermissions as seededRolePermissions } from "@/lib/permissions";
import { defaultPasswordExpiryDays, parsePasswordExpiryDays, passwordChangeRequired, passwordExpirySettingKey } from "@/lib/password-policy";
import { defaultDateFormat, dateFormatSettingKey, formatDateValue, isoDate, parseDateFormat, type DateFormat } from "@/lib/date-format";
import type { RoleKey } from "@/lib/types";

export type SelectOption = {
  id: string;
  label: string;
};

export type PermissionOption = {
  key: string;
  label: string;
};

export type RoleSetting = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
};

export type UserSetting = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: string[];
  passwordChangedAt: string;
  passwordExpired: boolean;
  hasRecoveryQuestion: boolean;
};

export type PasswordPolicySetting = {
  expiryDays: number;
};

export type DisplaySetting = {
  dateFormat: DateFormat;
};

export type DashboardStats = {
  totalColumns: number;
  acceptedColumns: number;
  notAcceptedColumns: number;
  pendingMasters: number;
  activeMasters: number;
  byType: Array<{ label: string; value: number }>;
  byStatus: Array<{ label: string; value: number }>;
  needsAttention: Array<{ label: string; value: number; href: string; permission: Permission }>;
};

function toDateLabel(value: Date | string | null | undefined, format: DateFormat = defaultDateFormat) {
  return formatDateValue(value, format);
}

function toSystemDateTimeLabel(value: Date, format: DateFormat = defaultDateFormat) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${toDateLabel(value, format)} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function joined(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join(" · ");
}

function performanceParameterRows(rawValues: unknown): Array<{ label: string; value: string }> {
  const parameters = asAuditRecord(rawValues)?.parameters;
  if (!Array.isArray(parameters)) return [];

  return parameters.map((parameter) => {
    const p = parameter as { label?: string; unit?: string; value?: number; lowLimit?: number; highLimit?: number; result?: string };
    const range = p.lowLimit !== undefined || p.highLimit !== undefined ? ` [${p.lowLimit ?? "-"} to ${p.highLimit ?? "-"}]` : "";
    return {
      label: `${p.label ?? "Parameter"}${p.unit ? ` (${p.unit})` : ""}`,
      value: `${p.value ?? "-"}${range} — ${p.result === "pass" ? "Complies" : "Does not comply"}`
    };
  });
}

export function matchesRecordQuery(record: ActivityRecord, query: string) {
  if (!query) return true;
  const haystack = [
    record.title,
    record.subtitle,
    record.owner,
    record.date,
    record.columnId,
    record.masterName,
    ...(record.detailRows?.flatMap((row) => [row.label, row.value]) ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function cleanDimensions(value: string) {
  return value
    .split(" · ")
    .filter((part) => !part.toLowerCase().startsWith("packing:"))
    .join(" · ");
}

function receiptDisplayStatus(receiptStatus: ActivityStatus, columnStatus?: ColumnStatus): ActivityStatus {
  if (receiptStatus !== "accepted") return receiptStatus;
  if (columnStatus === "issued") return "issued";
  if (columnStatus === "destroyed") return "destroyed";
  if (columnStatus === "on_hold") return "on_hold";
  return "accepted";
}

function masterRecordTitle(master: Pick<ColumnMaster, "name" | "partNumber">) {
  return master.partNumber || master.name;
}

function masterRecordSubtitle(master: Pick<ColumnMaster, "packing" | "dimensions">) {
  return joined([master.packing, master.dimensions]);
}

function masterActivityStatus(status: ColumnMaster["status"]): ActivityStatus {
  if (status === "active") return "accepted";
  if (status === "retired") return "retired";
  if (status === "draft") return "draft";
  return "pending_review";
}

function masterStatusLabel(status: ColumnMaster["status"]) {
  if (status === "active") return "Active";
  if (status === "retired") return "Inactive";
  if (status === "draft") return "Draft";
  return undefined;
}

function masterEditHref(master: ColumnMaster) {
  return master.status === "draft" || master.status === "pending_review" ? `/masters?edit=${master.id}` : undefined;
}

function asAuditRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringifyAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "blank";
  if (value instanceof Date) return toSystemDateTimeLabel(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Internal / foreign-key / plumbing fields that are meaningless (or leak raw UUIDs) to a
// human reading the audit trail. They're dropped from the before/after change summary.
const auditHiddenKeys = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "completedBy",
  "completedAt",
  "requestedBy",
  "startedBy",
  "reviewerApprovedBy",
  "finalApprovedBy",
  "workflowRunId",
  "assignedPermission",
  "module",
  "step",
  "entityType",
  "entityId",
  "masterId",
  "columnMasterId",
  "columnUnitId",
  "issueToId",
  "currentHolderId",
  "usedByColumnUnitId",
  "dedicatedAt",
  "destroyedAt",
  "storageKey",
  "checksumSha256",
  "parameterTemplate",
  "values",
  "criteria",
  "masterSnapshot"
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanizeFieldName(key: string) {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function auditChangeValues(before: unknown, after: unknown) {
  const previous = asAuditRecord(before);
  const next = asAuditRecord(after);
  if (!previous || !next) return { previousValue: "NA", nextValue: "NA" };

  // Only compare fields present in BOTH snapshots. When before/after are different entity
  // shapes (e.g. a column unit vs. the issuance created from it), the union would produce
  // meaningless "field: blank" rows — the intersection keeps the summary honest.
  const keys = Object.keys(previous)
    .filter((key) => key in next)
    .filter((key) => !auditHiddenKeys.has(key) && !/id$/i.test(key))
    .filter((key) => !uuidPattern.test(String(previous[key] ?? "")) && !uuidPattern.test(String(next[key] ?? "")))
    .filter((key) => stringifyAuditValue(previous[key]) !== stringifyAuditValue(next[key]));

  if (!keys.length) return { previousValue: "NA", nextValue: "NA" };
  const limitedKeys = keys.slice(0, 6);
  const suffix = keys.length > limitedKeys.length ? `; +${keys.length - limitedKeys.length} more` : "";
  return {
    previousValue: limitedKeys.map((key) => `${humanizeFieldName(key)}: ${stringifyAuditValue(previous[key])}`).join("; ") + suffix,
    nextValue: limitedKeys.map((key) => `${humanizeFieldName(key)}: ${stringifyAuditValue(next[key])}`).join("; ") + suffix
  };
}

const getDisplayLookups = cache(async function getDisplayLookups() {
  const db = getDb();
  // Reuse getMasters()/getColumns() (both request-memoized via cache()) instead of running
  // separate raw queries against the same tables — this is the module/column label resolver
  // used by every non-masters module page, so avoiding a second full-table read here matters.
  const [userRows, masterRows, columnRows] = await Promise.all([db.select({ id: users.id, name: users.name, email: users.email }).from(users), getMasters(), getColumns()]);

  const userNames = new Map(userRows.map((user) => [user.id, user.name ?? user.email ?? user.id]));
  const masters = new Map(masterRows.map((master) => [master.id, master]));
  const columns = new Map(columnRows.map((column) => [column.id, column]));

  function userLabel(id?: string | null, fallback = "System") {
    return id ? userNames.get(id) ?? id : fallback;
  }

  function masterLabel(id?: string | null) {
    if (!id) return undefined;
    const master = masters.get(id);
    return master ? joined([master.partNumber, master.manufacturer, master.packing, master.dimensions]) : id;
  }

  function shortMasterLabel(id?: string | null) {
    if (!id) return undefined;
    return masters.get(id)?.partNumber ?? id;
  }

  function columnLabel(id?: string | null) {
    if (!id) return undefined;
    return columns.get(id)?.assetCode ?? id;
  }

  function columnMasterLabel(id?: string | null) {
    if (!id) return undefined;
    const column = columns.get(id);
    return column ? shortMasterLabel(column.masterId) : undefined;
  }

  function columnSerial(id?: string | null) {
    if (!id) return undefined;
    return columns.get(id)?.serialNumber;
  }

  function columnStatus(id?: string | null) {
    if (!id) return undefined;
    return columns.get(id)?.status as ColumnStatus | undefined;
  }

  return { columnLabel, columnMasterLabel, columnSerial, columnStatus, masterLabel, shortMasterLabel, userLabel };
});

const getEntityDisplayLabels = cache(async function getEntityDisplayLabels() {
  const db = getDb();
  const [lookups, receiptRows, issuanceRows, performanceRows, destructionRows, masterRows, columnRows] = await Promise.all([
    getDisplayLookups(),
    db.select({ id: receipts.id, columnUnitId: receipts.columnUnitId, serialNumber: receipts.serialNumber }).from(receipts),
    db.select({ id: issuances.id, columnUnitId: issuances.columnUnitId, purpose: issuances.purpose }).from(issuances),
    db.select({ id: performanceEntries.id, columnUnitId: performanceEntries.columnUnitId, method: performanceEntries.method }).from(performanceEntries),
    db.select({ id: destructions.id, columnUnitId: destructions.columnUnitId, reason: destructions.reason }).from(destructions),
    getMasters(),
    getColumns()
  ]);

  const labels = new Map<string, string>();
  for (const row of receiptRows) labels.set(`receipt:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.serialNumber]) || row.id);
  for (const row of issuanceRows) labels.set(`issuance:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.purpose]) || row.id);
  for (const row of performanceRows) labels.set(`performance:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.method]) || row.id);
  for (const row of destructionRows) labels.set(`destruction:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.reason]) || row.id);
  for (const row of masterRows) labels.set(`column_master:${row.id}`, row.name);
  for (const row of columnRows) labels.set(`column_unit:${row.id}`, row.assetCode);

  return { labels, userLabel: lookups.userLabel };
});

export const getMasters = cache(async function getMasters(): Promise<ColumnMaster[]> {
  const { dateFormat } = await getDisplaySetting();
  if (!hasDatabase()) return columnMasters.map((master) => ({ ...master, createdAt: toDateLabel(master.createdAt, dateFormat), dimensions: cleanDimensions(master.dimensions) }));
  const rows = await getDb().select().from(columnMastersTable).orderBy(desc(columnMastersTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    columnType: row.columnType,
    manufacturer: row.manufacturer,
    partNumber: row.partNumber,
    lengthValue: row.lengthValue ?? undefined,
    lengthUnit: row.lengthUnit ?? undefined,
    diameterValue: row.diameterValue ?? undefined,
    diameterUnit: row.diameterUnit ?? undefined,
    particleSizeValue: row.particleSizeValue ?? undefined,
    particleSizeUnit: row.particleSizeUnit ?? undefined,
    packing: row.packing,
    dimensions: cleanDimensions(row.dimensions),
    status: row.status as ColumnMaster["status"],
    createdAt: toDateLabel(row.createdAt, dateFormat),
    parameterTemplate: []
  }));
});

export const getColumns = cache(async function getColumns(): Promise<ColumnUnit[]> {
  const { dateFormat } = await getDisplaySetting();
  if (!hasDatabase()) return sampleColumns.map((column) => ({ ...column, receivedAt: toDateLabel(column.receivedAt, dateFormat) }));
  const holders = users;
  const rows = await getDb()
    .select({
      id: columnUnits.id,
      assetCode: columnUnits.assetCode,
      serialNumber: columnUnits.serialNumber,
      masterId: columnUnits.masterId,
      status: columnUnits.status,
      currentHolderId: columnUnits.currentHolderId,
      holderName: holders.name,
      holderEmail: holders.email,
      storageLocation: columnUnits.storageLocation,
      dedicatedProduct: columnUnits.dedicatedProduct,
      dedicatedTest: columnUnits.dedicatedTest,
      receivedAt: columnUnits.receivedAt,
      masterPartNumber: columnMastersTable.partNumber,
      masterColumnType: columnMastersTable.columnType,
      masterManufacturer: columnMastersTable.manufacturer,
      masterPacking: columnMastersTable.packing,
      masterDimensions: columnMastersTable.dimensions
    })
    .from(columnUnits)
    .leftJoin(columnMastersTable, eq(columnUnits.masterId, columnMastersTable.id))
    .leftJoin(holders, eq(columnUnits.currentHolderId, holders.id))
    .orderBy(desc(columnUnits.createdAt));

  return rows.map((row) => ({
    id: row.id,
    assetCode: row.assetCode,
    serialNumber: row.serialNumber,
    masterId: row.masterId,
    status: row.status,
    currentHolder: row.currentHolderId ? row.holderName ?? row.holderEmail ?? row.currentHolderId : "QC Store",
    storageLocation: row.storageLocation,
    dedicatedProduct: row.dedicatedProduct ?? undefined,
    dedicatedTest: row.dedicatedTest ?? undefined,
    receivedAt: toDateLabel(row.receivedAt, dateFormat),
    master: row.masterPartNumber
      ? {
          partNumber: row.masterPartNumber,
          columnType: row.masterColumnType ?? "",
          manufacturer: row.masterManufacturer ?? "",
          packing: row.masterPacking ?? "",
          dimensions: cleanDimensions(row.masterDimensions ?? "")
        }
      : undefined
  }));
});

// Column-lifecycle register for the Reports module: one row per physical column, flattened to
// strings keyed by the shared reportFields ids so the client can freely pick/filter/print them.
export async function getColumnRegister(): Promise<ReportRow[]> {
  const columns = await getColumns();
  const performanceResultLabel = (result: string) => (result === "pass" ? "Pass" : result === "fail" ? "Fail" : result);

  if (!hasDatabase()) {
    return columns.map((column) => columnRegisterRow(column, undefined, undefined, performanceResultLabel));
  }

  const { dateFormat } = await getDisplaySetting();
  const db = getDb();
  const [performanceRows, destructionRows] = await Promise.all([
    db
      .select({ columnUnitId: performanceEntries.columnUnitId, method: performanceEntries.method, result: performanceEntries.result, performedDate: performanceEntries.performedDate })
      .from(performanceEntries)
      .orderBy(desc(performanceEntries.performedDate)),
    db
      .select({ columnUnitId: destructions.columnUnitId, reason: destructions.reason, status: destructions.status })
      .from(destructions)
      .orderBy(desc(destructions.createdAt))
  ]);

  const latestPerformance = new Map<string, { method: string; result: string; performedDate: Date | null }>();
  for (const row of performanceRows) {
    if (!latestPerformance.has(row.columnUnitId)) latestPerformance.set(row.columnUnitId, row);
  }
  const latestDestruction = new Map<string, { reason: string; status: string }>();
  for (const row of destructionRows) {
    if (!latestDestruction.has(row.columnUnitId)) latestDestruction.set(row.columnUnitId, row);
  }

  return columns.map((column) =>
    columnRegisterRow(
      column,
      latestPerformance.get(column.id) ? { ...latestPerformance.get(column.id)!, performedDate: toDateLabel(latestPerformance.get(column.id)!.performedDate, dateFormat) } : undefined,
      latestDestruction.get(column.id),
      performanceResultLabel
    )
  );
}

function columnRegisterRow(
  column: ColumnUnit,
  performance: { method: string; result: string; performedDate: string } | undefined,
  destruction: { reason: string; status: string } | undefined,
  performanceResultLabel: (result: string) => string
): ReportRow {
  return {
    assetCode: column.assetCode,
    columnType: column.master?.columnType ?? "",
    manufacturer: column.master?.manufacturer ?? "",
    partNumber: column.master?.partNumber ?? "",
    packing: column.master?.packing ?? "",
    dimensions: column.master?.dimensions ?? "",
    serialNumber: column.serialNumber,
    status: columnStatusLabels[column.status] ?? column.status,
    currentHolder: column.currentHolder,
    storageLocation: column.storageLocation,
    receivedAt: column.receivedAt ?? "",
    dedicatedProduct: column.dedicatedProduct ?? "",
    dedicatedTest: column.dedicatedTest ?? "",
    lastPerformanceMethod: performance?.method ?? "",
    lastPerformanceResult: performance ? performanceResultLabel(performance.result) : "",
    lastPerformanceDate: performance?.performedDate ?? "",
    destructionStatus: destruction ? statusLabels[destruction.status as ActivityStatus] ?? destruction.status : "",
    destructionReason: destruction?.reason ?? ""
  };
}

export function buildDashboardStats(masters: ColumnMaster[], columns: ColumnUnit[]): DashboardStats {
  const acceptedStatuses: ColumnStatus[] = ["available", "issued", "performance_pending", "on_hold", "destruction_pending", "destroyed"];
  const typeCounts = new Map<string, number>();
  const statusCounts = new Map<ColumnStatus, number>();

  for (const master of masters) {
    typeCounts.set(master.columnType, (typeCounts.get(master.columnType) ?? 0) + 1);
  }
  for (const column of columns) {
    statusCounts.set(column.status, (statusCounts.get(column.status) ?? 0) + 1);
  }

  const pendingMasters = masters.filter((master) => master.status !== "active").length;
  const countByStatus = (status: ColumnStatus) => statusCounts.get(status) ?? 0;

  const needsAttention = [
    { label: "Column masters awaiting approval", value: pendingMasters, href: "/masters?status=pending", permission: "masters:read" as Permission },
    { label: "Receipts awaiting review", value: countByStatus("pending_receipt_review"), href: "/receipt?status=pending", permission: "receipt:read" as Permission },
    { label: "Columns awaiting performance check", value: countByStatus("performance_pending"), href: "/performance?status=pending", permission: "performance:read" as Permission },
    { label: "Columns on hold (for destruction)", value: countByStatus("on_hold"), href: "/destruction?status=pending", permission: "destruction:read" as Permission },
    { label: "Destruction requests pending", value: countByStatus("destruction_pending"), href: "/destruction?status=pending", permission: "destruction:read" as Permission }
  ].filter((item) => item.value > 0);

  return {
    totalColumns: columns.length,
    acceptedColumns: columns.filter((column) => acceptedStatuses.includes(column.status)).length,
    notAcceptedColumns: columns.filter((column) => !acceptedStatuses.includes(column.status)).length,
    pendingMasters,
    activeMasters: masters.filter((master) => master.status === "active").length,
    byType: Array.from(typeCounts, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byStatus: Array.from(statusCounts, ([status, value]) => ({ label: columnStatusLabels[status], value })).sort((a, b) => b.value - a.value),
    needsAttention
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [masters, columns] = await Promise.all([getMasters(), getColumns()]);
  return buildDashboardStats(masters, columns);
}

export async function getPersonnelOptions(): Promise<SelectOption[]> {
  if (!hasDatabase()) return personnel.map((person) => ({ id: person, label: person }));
  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(users.name);
  return rows.map((row) => ({ id: row.id, label: row.name ?? row.email ?? row.id }));
}

export function buildMasterActivityRecords(masters: ColumnMaster[]): ActivityRecord[] {
  return masters.map((row) => ({
    id: row.id,
    module: "masters",
    title: masterRecordTitle(row),
    subtitle: masterRecordSubtitle(row),
    status: masterActivityStatus(row.status),
    statusLabel: masterStatusLabel(row.status),
    owner: row.manufacturer,
    date: row.createdAt ?? "",
    columnId: row.partNumber,
    masterName: row.name,
    detailActionHref: masterEditHref(row),
    detailActionLabel: "Edit",
    detailRows: [
      { label: "Column type", value: row.columnType },
      { label: "Manufacturer", value: row.manufacturer },
      { label: "Created", value: row.createdAt ?? "-" },
      { label: "Part number", value: row.partNumber },
      { label: "Packing", value: row.packing || "-" },
      { label: "Dimensions", value: row.dimensions }
    ],
    attachments: []
  }));
}

export async function getModuleRecords(module: ModuleKey): Promise<ActivityRecord[]> {
  // Masters go through getMasters() directly (handles both DB and sample-data modes itself),
  // so this skips getDisplayLookups()'s full users/masters/columns scan for a module that doesn't need it.
  if (module === "masters") {
    return buildMasterActivityRecords(await getMasters());
  }

  const { dateFormat } = await getDisplaySetting();
  if (!hasDatabase()) {
    return activityRecords.filter((record) => record.module === module).map((record) => ({ ...record, date: toDateLabel(record.date, dateFormat) || record.date }));
  }
  const db = getDb();
  const lookups = await getDisplayLookups();

  if (module === "receipt") {
    const rows = await db.select().from(receipts).orderBy(desc(receipts.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "receipt",
      title: lookups.columnLabel(row.columnUnitId) ?? row.serialNumber,
      subtitle: joined([lookups.shortMasterLabel(row.columnMasterId), row.supplier, row.serialNumber]),
      status: receiptDisplayStatus(row.status as ActivityStatus, lookups.columnStatus(row.columnUnitId)),
      owner: lookups.userLabel(row.createdBy, "QC"),
      date: toDateLabel(row.receivedDate, dateFormat),
      columnId: lookups.columnLabel(row.columnUnitId),
      masterName: lookups.masterLabel(row.columnMasterId),
      detailActionHref: row.status === "returned" ? `/receipt?edit=${row.id}` : undefined,
      detailActionLabel: "Edit",
      attachments: []
    }));
  }

  if (module === "issuance") {
    const rows = await db.select().from(issuances).orderBy(desc(issuances.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "issuance",
      title: lookups.columnLabel(row.columnUnitId) ?? row.columnUnitId,
      subtitle: joined([row.purpose, row.isDedicated ? "Dedicated" : undefined, row.dedicatedProduct, row.dedicatedTest]),
      status: row.status,
      owner: lookups.userLabel(row.issueToId, "Assigned"),
      date: toDateLabel(row.issueDate, dateFormat),
      columnId: lookups.columnLabel(row.columnUnitId),
      masterName: lookups.columnMasterLabel(row.columnUnitId),
      attachments: []
    }));
  }

  if (module === "performance") {
    const rows = await db.select().from(performanceEntries).orderBy(desc(performanceEntries.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "performance",
      title: lookups.columnLabel(row.columnUnitId) ?? row.columnUnitId,
      subtitle: joined([row.method, row.result.toUpperCase()]),
      status: row.status,
      owner: lookups.userLabel(row.createdBy, "Analyst"),
      date: toDateLabel(row.performedDate, dateFormat),
      columnId: lookups.columnLabel(row.columnUnitId),
      masterName: lookups.columnMasterLabel(row.columnUnitId),
      detailRows: [
        { label: "Method", value: row.method },
        { label: "Performed", value: toDateLabel(row.performedDate, dateFormat) },
        { label: "Overall result", value: row.result === "pass" ? "Complies" : "Does not comply" },
        ...performanceParameterRows(row.values)
      ],
      attachments: []
    }));
  }

  if (module === "destruction") {
    const rows = await db.select().from(destructions).orderBy(desc(destructions.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "destruction",
      title: lookups.columnLabel(row.columnUnitId) ?? row.columnUnitId,
      subtitle: row.reason,
      status: row.status,
      owner: lookups.userLabel(row.createdBy, "Requester"),
      date: toDateLabel(row.requestedDate, dateFormat),
      columnId: lookups.columnLabel(row.columnUnitId),
      masterName: lookups.columnMasterLabel(row.columnUnitId),
      attachments: []
    }));
  }

  return [];
}

export async function getReceiptFormRecord(id: string): Promise<ReceiptFormRecord | undefined> {
  if (!hasDatabase()) return undefined;
  const [row] = await getDb().select().from(receipts).where(eq(receipts.id, id)).limit(1);
  if (!row || row.status !== "returned" || !row.columnMasterId) return undefined;
  return {
    id: row.id,
    columnMasterId: row.columnMasterId,
    serialNumber: row.serialNumber,
    supplier: row.supplier,
    poNumber: row.poNumber ?? "",
    receivedDate: isoDate(row.receivedDate),
    condition: row.condition === "Damaged" ? "Damaged" : "Intact",
    remarks: row.remarks ?? "",
    status: row.status
  };
}

export async function getReviewItems(): Promise<Array<ReviewItem & { permission?: string; taskId?: string }>> {
  const { dateFormat } = await getDisplaySetting();
  if (!hasDatabase()) {
    return reviewItems.map((item) => ({
      ...item,
      taskId: item.id,
      permission:
        item.module === "receipt"
          ? "receipt:approve"
          : item.module === "destruction"
            ? "destruction:review"
            : item.module === "masters"
              ? "masters:approve"
              : undefined
    }));
  }
  const rows = await getDb().select().from(approvalTasks).where(eq(approvalTasks.status, "pending")).orderBy(desc(approvalTasks.createdAt));
  const { labels, userLabel } = await getEntityDisplayLabels();
  return rows.map((row) => ({
    id: row.id,
    taskId: row.id,
    module: row.module as ModuleKey,
    recordId: row.entityId,
    title: labels.get(`${row.entityType}:${row.entityId}`) ?? row.entityId,
    requestedBy: userLabel(row.requestedBy, "Requester"),
    step: row.assignedPermission === "destruction:approve" ? "Final approval" : row.step,
    due: toDateLabel(row.createdAt, dateFormat),
    permission: row.assignedPermission
  }));
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  if (!hasDatabase()) return auditEvents;
  const rows = await getDb().select().from(auditEventsTable).orderBy(desc(auditEventsTable.createdAt));
  const { labels, userLabel } = await getEntityDisplayLabels();
  const { dateFormat } = await getDisplaySetting();
  return rows.map((row) => {
    const changes = auditChangeValues(row.before, row.after);
    return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: labels.get(`${row.entityType}:${row.entityId}`) ?? row.entityId,
    actor: userLabel(row.actorId, "System"),
    at: toSystemDateTimeLabel(row.createdAt, dateFormat),
    reason: row.reason ?? undefined,
    previousValue: changes.previousValue,
    nextValue: changes.nextValue
  };
  });
}

export async function getRoleSettings(): Promise<{ roles: RoleSetting[]; permissions: PermissionOption[] }> {
  const catalogPermissions = Object.entries(permissionHumanLabels).map(([key, label]) => ({ key, label }));

  if (!hasDatabase()) {
    return {
      permissions: catalogPermissions,
      roles: (Object.keys(seededRolePermissions) as RoleKey[]).map((key) => ({
        id: key,
        key,
        name: roleLabels[key],
        isSystem: true,
        permissions: seededRolePermissions[key]
      }))
    };
  }

  const db = getDb();
  const [roleRows, permissionRows, assignedRows] = await Promise.all([
    db.select().from(roles).orderBy(roles.name),
    db.select().from(permissions).orderBy(permissions.key),
    db.select({ roleId: rolePermissions.roleId, permissionKey: permissions.key }).from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
  ]);
  const permissionOptions = Array.from(
    new Map(
      [...catalogPermissions, ...permissionRows.map((permission) => ({ key: permission.key, label: permissionHumanLabels[permission.key] ?? permission.key }))].map(
        (permission) => [permission.key, permission]
      )
    ).values()
  ).sort((a, b) => a.key.localeCompare(b.key));

  return {
    permissions: permissionOptions,
    roles: roleRows.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.isSystem,
      permissions: assignedRows.filter((row) => row.roleId === role.id).map((row) => row.permissionKey)
    }))
  };
}

export async function getUserSettings(): Promise<UserSetting[]> {
  const policy = await getPasswordPolicySetting();
  const { dateFormat } = await getDisplaySetting();
  if (!hasDatabase()) {
    return [
      {
        id: "demo-admin",
        name: "QC Admin",
        email: "admin@example.com",
        isActive: true,
        roles: ["Administrator"],
        passwordChangedAt: "",
        passwordExpired: false,
        hasRecoveryQuestion: false
      }
    ];
  }

  const db = getDb();
  const [userRows, assignedRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isActive: users.isActive,
        passwordChangedAt: users.passwordChangedAt,
        passwordResetRequired: users.passwordResetRequired,
        securityQuestion: users.securityQuestion
      })
      .from(users)
      .orderBy(users.name),
    db.select({ userId: userRoles.userId, roleName: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id))
  ]);

  return userRows.map((user) => ({
    id: user.id,
    name: user.name ?? user.email ?? user.id,
    email: user.email ?? "",
    isActive: user.isActive,
    roles: assignedRows.filter((row) => row.userId === user.id).map((row) => row.roleName),
    passwordChangedAt: toDateLabel(user.passwordChangedAt, dateFormat),
    passwordExpired: passwordChangeRequired(user, policy.expiryDays),
    hasRecoveryQuestion: Boolean(user.securityQuestion)
  }));
}

export const getPasswordPolicySetting = cache(async function getPasswordPolicySetting(): Promise<PasswordPolicySetting> {
  if (!hasDatabase()) return { expiryDays: defaultPasswordExpiryDays };
  const [row] = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, passwordExpirySettingKey)).limit(1);
  return { expiryDays: parsePasswordExpiryDays(row?.value) };
});

export const getDisplaySetting = cache(async function getDisplaySetting(): Promise<DisplaySetting> {
  if (!hasDatabase()) return { dateFormat: defaultDateFormat };
  const [row] = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, dateFormatSettingKey)).limit(1);
  return { dateFormat: parseDateFormat(row?.value) };
});

export async function getRecoveryQuestion(email: string) {
  if (!hasDatabase()) return undefined;
  const [user] = await getDb()
    .select({ securityQuestion: users.securityQuestion })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return user?.securityQuestion ?? undefined;
}
