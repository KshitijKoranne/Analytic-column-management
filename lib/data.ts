import { desc, eq } from "drizzle-orm";
import {
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
import type { ActivityRecord, ActivityStatus, AuditEvent, ColumnMaster, ColumnStatus, ColumnUnit, ModuleKey, ReceiptFormRecord, ReviewItem } from "@/lib/types";
import { permissionHumanLabels, roleLabels } from "@/lib/labels";
import { rolePermissions as seededRolePermissions } from "@/lib/permissions";
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
};

export type DashboardStats = {
  totalColumns: number;
  acceptedColumns: number;
  notAcceptedColumns: number;
  pendingMasters: number;
  activeMasters: number;
  byType: Array<{ label: string; value: number }>;
  byStatus: Array<{ label: string; value: number }>;
};

function toDateLabel(value?: Date | string | null) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function toSystemDateTimeLabel(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function joined(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join(" · ");
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

export function auditChangeValues(before: unknown, after: unknown) {
  const previous = asAuditRecord(before);
  const next = asAuditRecord(after);
  if (!previous || !next) return { previousValue: "NA", nextValue: "NA" };

  const keys = Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]))
    .filter((key) => !["id", "createdAt", "updatedAt"].includes(key))
    .filter((key) => stringifyAuditValue(previous[key]) !== stringifyAuditValue(next[key]));

  if (!keys.length) return { previousValue: "NA", nextValue: "NA" };
  const limitedKeys = keys.slice(0, 6);
  const suffix = keys.length > limitedKeys.length ? `; +${keys.length - limitedKeys.length} more` : "";
  return {
    previousValue: limitedKeys.map((key) => `${key}: ${stringifyAuditValue(previous[key])}`).join("; ") + suffix,
    nextValue: limitedKeys.map((key) => `${key}: ${stringifyAuditValue(next[key])}`).join("; ") + suffix
  };
}

async function getDisplayLookups() {
  const db = getDb();
  const [userRows, masterRows, columnRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
    db
      .select({
        id: columnMastersTable.id,
        name: columnMastersTable.name,
        columnType: columnMastersTable.columnType,
        manufacturer: columnMastersTable.manufacturer,
        partNumber: columnMastersTable.partNumber,
        packing: columnMastersTable.packing,
        dimensions: columnMastersTable.dimensions
      })
      .from(columnMastersTable),
    db
      .select({
        id: columnUnits.id,
        assetCode: columnUnits.assetCode,
        serialNumber: columnUnits.serialNumber,
        masterId: columnUnits.masterId,
        status: columnUnits.status
      })
      .from(columnUnits)
  ]);

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
}

async function getEntityDisplayLabels() {
  const db = getDb();
  const lookups = await getDisplayLookups();
  const [receiptRows, issuanceRows, performanceRows, destructionRows, masterRows, columnRows] = await Promise.all([
    db.select({ id: receipts.id, columnUnitId: receipts.columnUnitId, serialNumber: receipts.serialNumber }).from(receipts),
    db.select({ id: issuances.id, columnUnitId: issuances.columnUnitId, purpose: issuances.purpose }).from(issuances),
    db.select({ id: performanceEntries.id, columnUnitId: performanceEntries.columnUnitId, method: performanceEntries.method }).from(performanceEntries),
    db.select({ id: destructions.id, columnUnitId: destructions.columnUnitId, reason: destructions.reason }).from(destructions),
    db.select({ id: columnMastersTable.id, name: columnMastersTable.name }).from(columnMastersTable),
    db.select({ id: columnUnits.id, assetCode: columnUnits.assetCode }).from(columnUnits)
  ]);

  const labels = new Map<string, string>();
  for (const row of receiptRows) labels.set(`receipt:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.serialNumber]) || row.id);
  for (const row of issuanceRows) labels.set(`issuance:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.purpose]) || row.id);
  for (const row of performanceRows) labels.set(`performance:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.method]) || row.id);
  for (const row of destructionRows) labels.set(`destruction:${row.id}`, joined([lookups.columnLabel(row.columnUnitId), row.reason]) || row.id);
  for (const row of masterRows) labels.set(`column_master:${row.id}`, row.name);
  for (const row of columnRows) labels.set(`column_unit:${row.id}`, row.assetCode);

  return { labels, userLabel: lookups.userLabel };
}

export async function getMasters(): Promise<ColumnMaster[]> {
  if (!hasDatabase()) return columnMasters.map((master) => ({ ...master, dimensions: cleanDimensions(master.dimensions) }));
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
    createdAt: toDateLabel(row.createdAt),
    parameterTemplate: []
  }));
}

export async function getColumns(): Promise<ColumnUnit[]> {
  if (!hasDatabase()) return sampleColumns;
  const rows = await getDb().select().from(columnUnits).orderBy(desc(columnUnits.createdAt));
  return rows.map((row) => ({
    id: row.id,
    assetCode: row.assetCode,
    serialNumber: row.serialNumber,
    masterId: row.masterId,
    status: row.status,
    currentHolder: row.currentHolderId ?? "QC Store",
    storageLocation: row.storageLocation,
    dedicatedProduct: row.dedicatedProduct ?? undefined,
    dedicatedTest: row.dedicatedTest ?? undefined,
    receivedAt: toDateLabel(row.receivedAt)
  }));
}

export function buildDashboardStats(masters: ColumnMaster[], columns: ColumnUnit[]): DashboardStats {
  const acceptedStatuses: ColumnStatus[] = ["available", "issued", "performance_pending", "on_hold", "destruction_pending", "destroyed"];
  const statusLabels: Record<ColumnStatus, string> = {
    received_draft: "Draft",
    pending_receipt_review: "Pending receipt",
    available: "Available",
    issued: "Issued",
    performance_pending: "Performance pending",
    on_hold: "On hold",
    destruction_pending: "Destruction pending",
    destroyed: "Destroyed"
  };
  const typeCounts = new Map<string, number>();
  const statusCounts = new Map<ColumnStatus, number>();

  for (const master of masters) {
    typeCounts.set(master.columnType, (typeCounts.get(master.columnType) ?? 0) + 1);
  }
  for (const column of columns) {
    statusCounts.set(column.status, (statusCounts.get(column.status) ?? 0) + 1);
  }

  return {
    totalColumns: columns.length,
    acceptedColumns: columns.filter((column) => acceptedStatuses.includes(column.status)).length,
    notAcceptedColumns: columns.filter((column) => !acceptedStatuses.includes(column.status)).length,
    pendingMasters: masters.filter((master) => master.status !== "active").length,
    activeMasters: masters.filter((master) => master.status === "active").length,
    byType: Array.from(typeCounts, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byStatus: Array.from(statusCounts, ([status, value]) => ({ label: statusLabels[status], value })).sort((a, b) => b.value - a.value)
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

export async function getModuleRecords(module: ModuleKey): Promise<ActivityRecord[]> {
  if (!hasDatabase()) {
    if (module === "masters") {
      return columnMasters.map((row) => ({
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
    return activityRecords.filter((record) => record.module === module);
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
      date: toDateLabel(row.receivedDate),
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
      date: toDateLabel(row.issueDate),
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
      date: toDateLabel(row.performedDate),
      columnId: lookups.columnLabel(row.columnUnitId),
      masterName: lookups.columnMasterLabel(row.columnUnitId),
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
      date: toDateLabel(row.requestedDate),
      columnId: lookups.columnLabel(row.columnUnitId),
      masterName: lookups.columnMasterLabel(row.columnUnitId),
      attachments: []
    }));
  }

  if (module === "masters") {
    const rows = await getMasters();
    return rows.map((row) => ({
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
    receivedDate: toDateLabel(row.receivedDate),
    condition: row.condition === "Damaged" ? "Damaged" : "Intact",
    remarks: row.remarks ?? "",
    status: row.status
  };
}

export async function getReviewItems(): Promise<Array<ReviewItem & { permission?: string; taskId?: string }>> {
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
    due: toDateLabel(row.createdAt),
    permission: row.assignedPermission
  }));
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  if (!hasDatabase()) return auditEvents;
  const rows = await getDb().select().from(auditEventsTable).orderBy(desc(auditEventsTable.createdAt));
  const { labels, userLabel } = await getEntityDisplayLabels();
  return rows.map((row) => {
    const changes = auditChangeValues(row.before, row.after);
    return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: labels.get(`${row.entityType}:${row.entityId}`) ?? row.entityId,
    actor: userLabel(row.actorId, "System"),
    at: toSystemDateTimeLabel(row.createdAt),
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
  if (!hasDatabase()) {
    return [
      {
        id: "demo-admin",
        name: "QC Admin",
        email: "admin@example.com",
        isActive: true,
        roles: ["Administrator"]
      }
    ];
  }

  const db = getDb();
  const [userRows, assignedRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, isActive: users.isActive }).from(users).orderBy(users.name),
    db.select({ userId: userRoles.userId, roleName: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id))
  ]);

  return userRows.map((user) => ({
    id: user.id,
    name: user.name ?? user.email ?? user.id,
    email: user.email ?? "",
    isActive: user.isActive,
    roles: assignedRows.filter((row) => row.userId === user.id).map((row) => row.roleName)
  }));
}
