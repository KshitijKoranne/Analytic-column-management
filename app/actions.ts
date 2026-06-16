"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { eq, inArray } from "drizzle-orm";
import { signIn, signOut, auth } from "@/auth";
import {
  approvalTasks,
  attachments,
  auditEvents,
  columnMasters,
  columnUnits,
  destructions,
  issuances,
  permissions,
  performanceEntries,
  receipts,
  rolePermissions,
  roles,
  workflowRuns
} from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import { attachmentFromForm, storeAttachment } from "@/lib/attachments";
import { permissionLabels, hasPermission } from "@/lib/permissions";
import type { Permission, RoleKey } from "@/lib/types";
import { canIssueColumn, canRecordPerformance, canRequestDestruction } from "@/lib/workflows";
import { destructionSchema, issuanceSchema, masterSchema, performanceSchema, receiptSchema } from "@/lib/validation";

type Tx = {
  insert: ReturnType<typeof getDb>["insert"];
  update: ReturnType<typeof getDb>["update"];
  delete: ReturnType<typeof getDb>["delete"];
  select: ReturnType<typeof getDb>["select"];
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function dateValue(input: string) {
  return input ? new Date(`${input}T00:00:00`) : new Date();
}

function optionalNumber(input: string) {
  if (!input) return undefined;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parameterId(label: string, index: number) {
  const key = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);
  return key || `parameter_${index + 1}`;
}

function buildDimensions(formData: FormData) {
  const parts = [
    ["ID", value(formData, "internalDiameter"), value(formData, "internalDiameterUnit")],
    ["Length", value(formData, "length"), value(formData, "lengthUnit")],
    ["Particle", value(formData, "particleSize"), value(formData, "particleSizeUnit")]
  ];

  return parts
    .filter(([, amount]) => amount)
    .map(([label, amount, unit]) => `${label}: ${amount} ${unit}`.trim())
    .join(" · ");
}

function buildParameterTemplate(formData: FormData) {
  const count = Number(value(formData, "parameterCount") || "0");
  const parameters = [];
  const inputTypes = new Set(["number", "select", "text", "checkbox"]);

  for (let index = 0; index < count; index += 1) {
    const label = value(formData, `parameter-${index}-label`);
    if (!label) continue;
    const inputType = value(formData, `parameter-${index}-type`);
    const lowLimit = optionalNumber(value(formData, `parameter-${index}-low`));
    const highLimit = optionalNumber(value(formData, `parameter-${index}-high`));

    const parameter: {
      id: string;
      label: string;
      unit: string;
      inputType: "number" | "select" | "text" | "checkbox";
      required: boolean;
      lowLimit?: number;
      highLimit?: number;
    } = {
      id: parameterId(label, index),
      label,
      unit: value(formData, `parameter-${index}-unit`),
      inputType: (inputTypes.has(inputType) ? inputType : "number") as "number" | "select" | "text" | "checkbox",
      required: value(formData, `parameter-${index}-required`) === "yes"
    };
    if (lowLimit !== undefined) parameter.lowLimit = lowLimit;
    if (highLimit !== undefined) parameter.highLimit = highLimit;
    parameters.push(parameter);
  }

  return parameters.length
    ? parameters
    : [{ id: "result", label: "Result", unit: "", inputType: "text" as const, required: true }];
}

async function currentUser(permission?: Permission) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const roles = (session.user.roles ?? [session.user.role ?? "auditor"]) as RoleKey[];
  const grantedPermissions = session.user.permissions ?? [];
  const hasDbPermission = grantedPermissions.includes("*") || grantedPermissions.includes(permission ?? "");
  const hasSeedPermission = hasPermission(roles, permission ?? "audit:read");
  if (permission && !hasDbPermission && !hasSeedPermission) {
    throw new Error("Forbidden");
  }

  return { id: session.user.id, roles };
}

function roleKeyFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

async function ensurePermissions(tx: Tx, selectedPermissions: string[]) {
  const validPermissions = selectedPermissions.filter((permission): permission is Permission => permission in permissionLabels);

  for (const permissionKey of validPermissions) {
    const [resource, action] = permissionKey.split(":");
    await tx
      .insert(permissions)
      .values({ key: permissionKey, resource, action })
      .onConflictDoNothing();
  }

  return validPermissions.length
    ? tx.select({ id: permissions.id, key: permissions.key }).from(permissions).where(inArray(permissions.key, validPermissions))
    : [];
}

async function writeAudit(
  tx: Tx,
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }
) {
  await tx.insert(auditEvents).values(input);
}

async function startReview(
  tx: Tx,
  input: {
    module: string;
    entityType: string;
    entityId: string;
    step: string;
    assignedPermission: Permission;
    requestedBy: string;
  }
) {
  const [run] = await tx
    .insert(workflowRuns)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      currentStep: input.step,
      status: "open",
      startedBy: input.requestedBy
    })
    .returning();

  const [task] = await tx
    .insert(approvalTasks)
    .values({
      workflowRunId: run.id,
      entityType: input.entityType,
      entityId: input.entityId,
      module: input.module,
      step: input.step,
      assignedPermission: input.assignedPermission,
      requestedBy: input.requestedBy
    })
    .returning();

  return { run, task };
}

async function insertAttachment(tx: Tx, input: { formData: FormData; entityType: string; entityId: string; uploadedBy: string }) {
  const stored = await storeAttachment(attachmentFromForm(input.formData));
  if (!stored) return null;

  const [row] = await tx
    .insert(attachments)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.storageKey,
      uploadedBy: input.uploadedBy
    })
    .returning();

  await writeAudit(tx, {
    actorId: input.uploadedBy,
    action: "attachment.uploaded",
    entityType: input.entityType,
    entityId: input.entityId,
    after: row
  });

  return row;
}

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: value(formData, "email"),
      password: value(formData, "password"),
      redirectTo: "/receipt"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createRoleAction(formData: FormData) {
  const user = await currentUser("settings:update");
  const name = value(formData, "name");
  const roleKey = roleKeyFromName(name);
  const selectedPermissions = formData.getAll("permissions").map(String).filter(Boolean);

  if (!name || !roleKey) {
    throw new Error("Role name is required.");
  }

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [role] = await tx.insert(roles).values({ key: roleKey, name, isSystem: false }).returning();
      const permissionRows = await ensurePermissions(tx, selectedPermissions);

      for (const permission of permissionRows) {
        await tx.insert(rolePermissions).values({ roleId: role.id, permissionId: permission.id }).onConflictDoNothing();
      }

      await writeAudit(tx, {
        actorId: user.id,
        action: "role.created",
        entityType: "role",
        entityId: role.id,
        after: { role, permissions: permissionRows.map((permission) => permission.key) },
        reason: "Role settings"
      });
    });
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
}

export async function updateRolePermissionsAction(formData: FormData) {
  const user = await currentUser("settings:update");
  const roleId = value(formData, "roleId");
  const selectedPermissions = formData.getAll("permissions").map(String).filter(Boolean);

  if (!roleId) {
    throw new Error("Role is required.");
  }

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [role] = await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!role) throw new Error("Role not found.");

      const before = await tx
        .select({ key: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, roleId));
      const permissionRows = await ensurePermissions(tx, selectedPermissions);

      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      for (const permission of permissionRows) {
        await tx.insert(rolePermissions).values({ roleId, permissionId: permission.id }).onConflictDoNothing();
      }

      await writeAudit(tx, {
        actorId: user.id,
        action: "role.permissions_updated",
        entityType: "role",
        entityId: roleId,
        before: { role, permissions: before.map((permission) => permission.key) },
        after: { role, permissions: permissionRows.map((permission) => permission.key) },
        reason: "Role rights"
      });
    });
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
}

export async function deleteRoleAction(formData: FormData) {
  const user = await currentUser("settings:update");
  const roleId = value(formData, "roleId");

  if (!roleId) {
    throw new Error("Role is required.");
  }

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [role] = await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!role) throw new Error("Role not found.");
      if (role.isSystem) throw new Error("System roles cannot be deleted.");

      await tx.delete(roles).where(eq(roles.id, roleId));
      await writeAudit(tx, {
        actorId: user.id,
        action: "role.deleted",
        entityType: "role",
        entityId: roleId,
        before: role,
        reason: "Role settings"
      });
    });
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
}

export async function createMasterAction(formData: FormData) {
  const user = await currentUser("masters:create");
  const dimensions = buildDimensions(formData);
  const parameterTemplate = buildParameterTemplate(formData);
  const parsed = masterSchema.parse({
    name: value(formData, "name"),
    columnType: value(formData, "columnType"),
    manufacturer: value(formData, "manufacturer"),
    partNumber: value(formData, "partNumber"),
    dimensions,
    remarks: value(formData, "remarks")
  });
  const { remarks, ...masterInput } = parsed;

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [master] = await tx
        .insert(columnMasters)
        .values({
          ...masterInput,
          status: "pending_review",
          parameterTemplate,
          createdBy: user.id,
          updatedBy: user.id
        })
        .returning();

      await startReview(tx, {
        module: "masters",
        entityType: "column_master",
        entityId: master.id,
        step: "Master activation",
        assignedPermission: "masters:approve",
        requestedBy: user.id
      });
      await writeAudit(tx, {
        actorId: user.id,
        action: "master.submitted",
        entityType: "column_master",
        entityId: master.id,
        after: master,
        reason: remarks
      });
    });
  }

  revalidatePath("/masters");
  revalidatePath("/reviews");
}

export async function createReceiptAction(formData: FormData) {
  const user = await currentUser("receipt:create");
  const parsed = receiptSchema.parse({
    columnMasterId: value(formData, "columnMasterId"),
    serialNumber: value(formData, "serialNumber"),
    supplier: value(formData, "supplier"),
    receivedDate: value(formData, "receivedDate"),
    storageLocation: value(formData, "storageLocation"),
    condition: value(formData, "condition"),
    remarks: value(formData, "remarks")
  });

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [master] = await tx.select().from(columnMasters).where(eq(columnMasters.id, parsed.columnMasterId)).limit(1);
      if (!master || master.status !== "active") {
        throw new Error("Column master is not active.");
      }

      const assetCode = `COL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const [unit] = await tx
        .insert(columnUnits)
        .values({
          assetCode,
          serialNumber: parsed.serialNumber,
          masterId: parsed.columnMasterId,
          status: "pending_receipt_review",
          storageLocation: parsed.storageLocation,
          receivedAt: dateValue(parsed.receivedDate)
        })
        .returning();

      const [receipt] = await tx
        .insert(receipts)
        .values({
          columnUnitId: unit.id,
          columnMasterId: parsed.columnMasterId,
          supplier: parsed.supplier,
          serialNumber: parsed.serialNumber,
          receivedDate: dateValue(parsed.receivedDate),
          storageLocation: parsed.storageLocation,
          condition: parsed.condition,
          status: "pending_review",
          remarks: parsed.remarks,
          createdBy: user.id
        })
        .returning();

      await startReview(tx, {
        module: "receipt",
        entityType: "receipt",
        entityId: receipt.id,
        step: "Receipt acceptance",
        assignedPermission: "receipt:approve",
        requestedBy: user.id
      });
      await insertAttachment(tx, { formData, entityType: "receipt", entityId: receipt.id, uploadedBy: user.id });
      await writeAudit(tx, {
        actorId: user.id,
        action: "receipt.submitted",
        entityType: "receipt",
        entityId: receipt.id,
        after: receipt,
        reason: parsed.remarks
      });
    });
  }

  revalidatePath("/receipt");
  revalidatePath("/reviews");
}

export async function createIssuanceAction(formData: FormData) {
  const user = await currentUser("issuance:create");
  const parsed = issuanceSchema.parse({
    columnId: value(formData, "columnId"),
    issueTo: value(formData, "issueTo"),
    issueDate: value(formData, "issueDate"),
    expectedReturnDate: value(formData, "expectedReturnDate"),
    purpose: value(formData, "purpose"),
    remarks: value(formData, "remarks")
  });

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [column] = await tx.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
      if (!column || !canIssueColumn(column.status)) {
        throw new Error("Column is not available for issuance.");
      }

      const [issuance] = await tx
        .insert(issuances)
        .values({
          columnUnitId: parsed.columnId,
          issueToId: parsed.issueTo,
          issueDate: dateValue(parsed.issueDate),
          expectedReturnDate: dateValue(parsed.expectedReturnDate),
          purpose: parsed.purpose,
          status: "issued",
          remarks: parsed.remarks,
          createdBy: user.id
        })
        .returning();

      await tx.update(columnUnits).set({ status: "issued", currentHolderId: parsed.issueTo }).where(eq(columnUnits.id, parsed.columnId));
      await writeAudit(tx, {
        actorId: user.id,
        action: "issuance.created",
        entityType: "issuance",
        entityId: issuance.id,
        before: column,
        after: issuance,
        reason: parsed.remarks
      });
    });
  }

  revalidatePath("/issuance");
}

export async function createPerformanceAction(formData: FormData) {
  const user = await currentUser("performance:create");
  const parsed = performanceSchema.parse({
    columnId: value(formData, "columnId"),
    method: value(formData, "method"),
    performedDate: value(formData, "performedDate"),
    result: value(formData, "result"),
    remarks: value(formData, "remarks")
  });

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [column] = await tx.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
      if (!column || !canRecordPerformance(column.status)) {
        throw new Error("Column is not issued for performance entry.");
      }

      const status = parsed.result === "pass" ? "recorded" : "pending_review";
      const [entry] = await tx
        .insert(performanceEntries)
        .values({
          columnUnitId: parsed.columnId,
          method: parsed.method,
          performedDate: dateValue(parsed.performedDate),
          values: {
            plates: value(formData, "plates"),
            tailing: value(formData, "tailing"),
            resolution: value(formData, "resolution"),
            pressure: value(formData, "pressure")
          },
          result: parsed.result,
          status,
          remarks: parsed.remarks,
          createdBy: user.id
        })
        .returning();

      if (parsed.result === "fail") {
        await tx.update(columnUnits).set({ status: "on_hold" }).where(eq(columnUnits.id, parsed.columnId));
        await startReview(tx, {
          module: "performance",
          entityType: "performance",
          entityId: entry.id,
          step: "Performance review",
          assignedPermission: "performance:approve",
          requestedBy: user.id
        });
      }

      await insertAttachment(tx, { formData, entityType: "performance", entityId: entry.id, uploadedBy: user.id });
      await writeAudit(tx, {
        actorId: user.id,
        action: "performance.recorded",
        entityType: "performance",
        entityId: entry.id,
        before: column,
        after: entry,
        reason: parsed.remarks
      });
    });
  }

  revalidatePath("/performance");
  revalidatePath("/reviews");
}

export async function createDestructionAction(formData: FormData) {
  const user = await currentUser("destruction:create");
  const parsed = destructionSchema.parse({
    columnId: value(formData, "columnId"),
    reason: value(formData, "reason"),
    requestedDate: value(formData, "requestedDate"),
    disposalMethod: value(formData, "disposalMethod"),
    remarks: value(formData, "remarks")
  });

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [column] = await tx.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
      if (!column || !canRequestDestruction(column.status)) {
        throw new Error("Column is not eligible for destruction.");
      }

      const [destruction] = await tx
        .insert(destructions)
        .values({
          columnUnitId: parsed.columnId,
          reason: parsed.reason,
          requestedDate: dateValue(parsed.requestedDate),
          disposalMethod: parsed.disposalMethod,
          remarks: parsed.remarks,
          status: "pending_review",
          createdBy: user.id
        })
        .returning();

      await tx.update(columnUnits).set({ status: "destruction_pending" }).where(eq(columnUnits.id, parsed.columnId));
      await startReview(tx, {
        module: "destruction",
        entityType: "destruction",
        entityId: destruction.id,
        step: "Technical review",
        assignedPermission: "destruction:review",
        requestedBy: user.id
      });
      await insertAttachment(tx, { formData, entityType: "destruction", entityId: destruction.id, uploadedBy: user.id });
      await writeAudit(tx, {
        actorId: user.id,
        action: "destruction.requested",
        entityType: "destruction",
        entityId: destruction.id,
        before: column,
        after: destruction,
        reason: parsed.remarks
      });
    });
  }

  revalidatePath("/destruction");
  revalidatePath("/reviews");
}

export async function approveTaskAction(formData: FormData) {
  const taskId = value(formData, "taskId");
  const permission = value(formData, "permission") as Permission;
  const user = await currentUser(permission);

  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [task] = await tx.select().from(approvalTasks).where(eq(approvalTasks.id, taskId)).limit(1);
      if (!task || task.status !== "pending") {
        throw new Error("Review task is not pending.");
      }

      await tx.update(approvalTasks).set({ status: "approved", completedBy: user.id, completedAt: new Date() }).where(eq(approvalTasks.id, taskId));
      await writeAudit(tx, {
        actorId: user.id,
        action: "review.approved",
        entityType: task.entityType,
        entityId: task.entityId,
        after: task,
        reason: task.step
      });

      if (task.entityType === "column_master") {
        await tx.update(columnMasters).set({ status: "active", updatedBy: user.id }).where(eq(columnMasters.id, task.entityId));
      }

      if (task.entityType === "receipt") {
        const [receipt] = await tx.select().from(receipts).where(eq(receipts.id, task.entityId)).limit(1);
        await tx.update(receipts).set({ status: "accepted" }).where(eq(receipts.id, task.entityId));
        if (receipt?.columnUnitId) {
          await tx.update(columnUnits).set({ status: "available" }).where(eq(columnUnits.id, receipt.columnUnitId));
        }
      }

      if (task.entityType === "destruction" && task.step === "Technical review") {
        await tx.update(destructions).set({ reviewerApprovedBy: user.id, status: "approved" }).where(eq(destructions.id, task.entityId));
        await startReview(tx, {
          module: "destruction",
          entityType: "destruction",
          entityId: task.entityId,
          step: "Manager approval",
          assignedPermission: "destruction:approve",
          requestedBy: user.id
        });
      }

      if (task.entityType === "destruction" && task.step === "Manager approval") {
        const now = new Date();
        const [destruction] = await tx
          .update(destructions)
          .set({ managerApprovedBy: user.id, status: "destroyed", destroyedAt: now })
          .where(eq(destructions.id, task.entityId))
          .returning();
        if (destruction?.columnUnitId) {
          await tx.update(columnUnits).set({ status: "destroyed", destroyedAt: now }).where(eq(columnUnits.id, destruction.columnUnitId));
        }
      }
    });
  }

  revalidatePath("/reviews");
  revalidatePath("/masters");
  revalidatePath("/receipt");
  revalidatePath("/destruction");
  revalidatePath("/audit");
}
