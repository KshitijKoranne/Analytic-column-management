"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
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
  userRoles,
  users,
  workflowRuns
} from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import { attachmentFromForm, storeAttachment } from "@/lib/attachments";
import { permissionLabels } from "@/lib/permissions";
import { getAccessContext } from "@/lib/access";
import type { Permission } from "@/lib/types";
import { canIssueColumn, canRecordPerformance, canRequestDestruction } from "@/lib/workflows";
import { destructionSchema, issuanceSchema, masterSchema, performanceSchema, receiptSchema, userSchema } from "@/lib/validation";

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

function actionError(path: string, error: unknown): never {
  console.error(`[action:${path}]`, error);
  redirect(`${path}?error=transaction`);
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
  const count = Math.min(Number(value(formData, "parameterCount") || "0"), 25);
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
  const context = await getAccessContext(permission);
  return { id: context.id, roles: context.roles };
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
      checksumSha256: stored.checksumSha256,
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
  try {
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
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
}

export async function updateRolePermissionsAction(formData: FormData) {
  const user = await currentUser("settings:update");
  try {
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
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
}

export async function deleteRoleAction(formData: FormData) {
  const user = await currentUser("settings:update");
  try {
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
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
}

export async function createUserAction(formData: FormData) {
  const actor = await currentUser("settings:update");
  try {
    const parsed = userSchema.parse({
      name: value(formData, "name"),
      email: value(formData, "email").toLowerCase(),
      password: value(formData, "password"),
      isActive: value(formData, "isActive") || "yes"
    });
    const selectedRoleIds = formData.getAll("roleIds").map(String).filter(Boolean);

    if (!selectedRoleIds.length) {
      throw new Error("At least one role is required.");
    }

    if (hasDatabase()) {
      const db = getDb();
      await db.transaction(async (tx) => {
        const roleRows = await tx.select().from(roles).where(inArray(roles.id, selectedRoleIds));
        if (roleRows.length !== selectedRoleIds.length) {
          throw new Error("Selected role is not available.");
        }

        const passwordHash = await bcrypt.hash(parsed.password, 12);
        const [createdUser] = await tx
          .insert(users)
          .values({
            name: parsed.name,
            email: parsed.email,
            passwordHash,
            isActive: parsed.isActive === "yes"
          })
          .returning();

        for (const role of roleRows) {
          await tx.insert(userRoles).values({ userId: createdUser.id, roleId: role.id }).onConflictDoNothing();
        }

        await writeAudit(tx, {
          actorId: actor.id,
          action: "user.created",
          entityType: "user",
          entityId: createdUser.id,
          after: {
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            isActive: createdUser.isActive,
            roles: roleRows.map((role) => role.key)
          },
          reason: "User administration"
        });
      });
    }
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
}

export async function createMasterAction(formData: FormData) {
  const user = await currentUser("masters:create");
  try {
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
  } catch (error) {
    actionError("/masters", error);
  }

  revalidatePath("/masters");
  revalidatePath("/reviews");
}

export async function createReceiptAction(formData: FormData) {
  const user = await currentUser("receipt:create");
  try {
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
  } catch (error) {
    actionError("/receipt", error);
  }

  revalidatePath("/receipt");
  revalidatePath("/reviews");
}

export async function createIssuanceAction(formData: FormData) {
  const user = await currentUser("issuance:create");
  try {
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
  } catch (error) {
    actionError("/issuance", error);
  }

  revalidatePath("/issuance");
}

export async function createPerformanceAction(formData: FormData) {
  const user = await currentUser("performance:create");
  try {
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
  } catch (error) {
    actionError("/performance", error);
  }

  revalidatePath("/performance");
  revalidatePath("/reviews");
}

export async function createDestructionAction(formData: FormData) {
  const user = await currentUser("destruction:create");
  try {
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
  } catch (error) {
    actionError("/destruction", error);
  }

  revalidatePath("/destruction");
  revalidatePath("/reviews");
}

export async function approveTaskAction(formData: FormData) {
  try {
    const taskId = value(formData, "taskId");
    const sessionUser = await currentUser();

    if (hasDatabase()) {
      const db = getDb();
      await db.transaction(async (tx) => {
        const [task] = await tx.select().from(approvalTasks).where(eq(approvalTasks.id, taskId)).limit(1);
        if (!task || task.status !== "pending") {
          throw new Error("Review task is not pending.");
        }
        await currentUser(task.assignedPermission as Permission);

        await tx.update(approvalTasks).set({ status: "approved", completedBy: sessionUser.id, completedAt: new Date() }).where(eq(approvalTasks.id, taskId));
        await writeAudit(tx, {
          actorId: sessionUser.id,
          action: "review.approved",
          entityType: task.entityType,
          entityId: task.entityId,
          after: task,
          reason: task.step
        });

        if (task.entityType === "column_master") {
          const [before] = await tx.select().from(columnMasters).where(eq(columnMasters.id, task.entityId)).limit(1);
          const [after] = await tx
            .update(columnMasters)
            .set({ status: "active", updatedBy: sessionUser.id })
            .where(eq(columnMasters.id, task.entityId))
            .returning();
          await writeAudit(tx, {
            actorId: sessionUser.id,
            action: "master.activated",
            entityType: "column_master",
            entityId: task.entityId,
            before,
            after,
            reason: task.step
          });
        }

        if (task.entityType === "receipt") {
          const [receipt] = await tx.select().from(receipts).where(eq(receipts.id, task.entityId)).limit(1);
          const [acceptedReceipt] = await tx.update(receipts).set({ status: "accepted" }).where(eq(receipts.id, task.entityId)).returning();
          await writeAudit(tx, {
            actorId: sessionUser.id,
            action: "receipt.accepted",
            entityType: "receipt",
            entityId: task.entityId,
            before: receipt,
            after: acceptedReceipt,
            reason: task.step
          });
          if (receipt?.columnUnitId) {
            const [unitBefore] = await tx.select().from(columnUnits).where(eq(columnUnits.id, receipt.columnUnitId)).limit(1);
            const [unitAfter] = await tx.update(columnUnits).set({ status: "available" }).where(eq(columnUnits.id, receipt.columnUnitId)).returning();
            await writeAudit(tx, {
              actorId: sessionUser.id,
              action: "column.available",
              entityType: "column_unit",
              entityId: receipt.columnUnitId,
              before: unitBefore,
              after: unitAfter,
              reason: task.step
            });
          }
        }

        if (task.entityType === "destruction" && task.step === "Technical review") {
          const [before] = await tx.select().from(destructions).where(eq(destructions.id, task.entityId)).limit(1);
          const [after] = await tx
            .update(destructions)
            .set({ reviewerApprovedBy: sessionUser.id, status: "approved" })
            .where(eq(destructions.id, task.entityId))
            .returning();
          await writeAudit(tx, {
            actorId: sessionUser.id,
            action: "destruction.reviewed",
            entityType: "destruction",
            entityId: task.entityId,
            before,
            after,
            reason: task.step
          });
          await startReview(tx, {
            module: "destruction",
            entityType: "destruction",
            entityId: task.entityId,
            step: "Manager approval",
            assignedPermission: "destruction:approve",
            requestedBy: sessionUser.id
          });
        }

        if (task.entityType === "destruction" && task.step === "Manager approval") {
          const now = new Date();
          const [before] = await tx.select().from(destructions).where(eq(destructions.id, task.entityId)).limit(1);
          const [destruction] = await tx
            .update(destructions)
            .set({ managerApprovedBy: sessionUser.id, status: "destroyed", destroyedAt: now })
            .where(eq(destructions.id, task.entityId))
            .returning();
          await writeAudit(tx, {
            actorId: sessionUser.id,
            action: "destruction.approved",
            entityType: "destruction",
            entityId: task.entityId,
            before,
            after: destruction,
            reason: task.step
          });
          if (destruction?.columnUnitId) {
            const [unitBefore] = await tx.select().from(columnUnits).where(eq(columnUnits.id, destruction.columnUnitId)).limit(1);
            const [unitAfter] = await tx
              .update(columnUnits)
              .set({ status: "destroyed", destroyedAt: now })
              .where(eq(columnUnits.id, destruction.columnUnitId))
              .returning();
            await writeAudit(tx, {
              actorId: sessionUser.id,
              action: "column.destroyed",
              entityType: "column_unit",
              entityId: destruction.columnUnitId,
              before: unitBefore,
              after: unitAfter,
              reason: task.step
            });
          }
        }
      });
    }
  } catch (error) {
    actionError("/reviews", error);
  }

  revalidatePath("/reviews");
  revalidatePath("/masters");
  revalidatePath("/receipt");
  revalidatePath("/destruction");
  revalidatePath("/audit");
}
