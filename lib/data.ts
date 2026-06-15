import { desc, eq } from "drizzle-orm";
import {
  approvalTasks,
  auditEvents as auditEventsTable,
  columnMasters as columnMastersTable,
  columnUnits,
  issuances,
  performanceEntries,
  receipts,
  destructions,
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
import type { ActivityRecord, AuditEvent, ColumnMaster, ColumnUnit, ModuleKey, ReviewItem } from "@/lib/types";

export type SelectOption = {
  id: string;
  label: string;
};

function toDateLabel(value?: Date | string | null) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export async function getMasters(): Promise<ColumnMaster[]> {
  if (!hasDatabase()) return columnMasters;
  const rows = await getDb().select().from(columnMastersTable).orderBy(desc(columnMastersTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    columnType: row.columnType,
    manufacturer: row.manufacturer,
    partNumber: row.partNumber,
    dimensions: row.dimensions,
    status: row.status as ColumnMaster["status"],
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
    receivedAt: toDateLabel(row.receivedAt)
  }));
}

export async function getPersonnelOptions(): Promise<SelectOption[]> {
  if (!hasDatabase()) return personnel.map((person) => ({ id: person, label: person }));
  const rows = await getDb().select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(users.name);
  return rows.map((row) => ({ id: row.id, label: row.name ?? row.email ?? row.id }));
}

export async function getModuleRecords(module: ModuleKey): Promise<ActivityRecord[]> {
  if (!hasDatabase()) return activityRecords.filter((record) => record.module === module);
  const db = getDb();

  if (module === "receipt") {
    const rows = await db.select().from(receipts).orderBy(desc(receipts.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "receipt",
      title: row.serialNumber,
      subtitle: row.supplier,
      status: row.status,
      owner: row.createdBy ?? "QC",
      date: toDateLabel(row.receivedDate),
      columnId: row.columnUnitId ?? undefined,
      attachments: []
    }));
  }

  if (module === "issuance") {
    const rows = await db.select().from(issuances).orderBy(desc(issuances.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "issuance",
      title: row.columnUnitId,
      subtitle: row.purpose,
      status: row.status,
      owner: row.issueToId ?? "Assigned",
      date: toDateLabel(row.issueDate),
      columnId: row.columnUnitId,
      attachments: []
    }));
  }

  if (module === "performance") {
    const rows = await db.select().from(performanceEntries).orderBy(desc(performanceEntries.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "performance",
      title: row.columnUnitId,
      subtitle: row.method,
      status: row.status,
      owner: row.createdBy ?? "Analyst",
      date: toDateLabel(row.performedDate),
      columnId: row.columnUnitId,
      attachments: []
    }));
  }

  if (module === "destruction") {
    const rows = await db.select().from(destructions).orderBy(desc(destructions.createdAt));
    return rows.map((row) => ({
      id: row.id,
      module: "destruction",
      title: row.columnUnitId,
      subtitle: row.reason,
      status: row.status,
      owner: row.createdBy ?? "Requester",
      date: toDateLabel(row.requestedDate),
      columnId: row.columnUnitId,
      attachments: []
    }));
  }

  if (module === "masters") {
    const rows = await getMasters();
    return rows.map((row) => ({
      id: row.id,
      module: "masters",
      title: row.name,
      subtitle: `${row.columnType} · ${row.dimensions}`,
      status: row.status === "active" ? "accepted" : "pending_review",
      owner: row.manufacturer,
      date: "",
      masterName: row.name,
      attachments: []
    }));
  }

  return [];
}

export async function getReviewItems(): Promise<Array<ReviewItem & { permission?: string; taskId?: string }>> {
  if (!hasDatabase()) return reviewItems;
  const rows = await getDb().select().from(approvalTasks).where(eq(approvalTasks.status, "pending")).orderBy(desc(approvalTasks.createdAt));
  return rows.map((row) => ({
    id: row.id,
    taskId: row.id,
    module: row.module as ModuleKey,
    recordId: row.entityId,
    title: row.entityId,
    requestedBy: row.requestedBy ?? "Requester",
    step: row.step,
    due: toDateLabel(row.createdAt),
    permission: row.assignedPermission
  }));
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  if (!hasDatabase()) return auditEvents;
  const rows = await getDb().select().from(auditEventsTable).orderBy(desc(auditEventsTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actor: row.actorId ?? "System",
    at: row.createdAt.toISOString().slice(0, 16).replace("T", " "),
    reason: row.reason ?? undefined
  }));
}
