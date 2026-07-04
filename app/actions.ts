"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import {
  appSettings,
  approvalTasks,
  attachments,
  auditEvents,
  columnIdPool,
  columnMasters,
  columnUnits,
  destructions,
  electronicSignatures,
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
import { attachmentsFromForm, storeAttachment } from "@/lib/attachments";
import { permissionLabels, workflowApprovalConflicts } from "@/lib/permissions";
import { getAccessContext } from "@/lib/access";
import type { Permission } from "@/lib/types";
import { normalizeSecurityAnswer, passwordExpirySettingKey } from "@/lib/password-policy";
import { verifyCaptcha } from "@/lib/captcha";
import { dateFormatSettingKey } from "@/lib/date-format";
import { canIssueColumn, canRecordPerformance, canRequestDestruction } from "@/lib/workflows";
import { evaluatePerformanceQualification, qualificationParameterCatalog, type QualificationParameterInput } from "@/lib/performance-qualification";
import { dateFormatText, destructionSchema, issuanceSchema, masterPartKey, masterSchema, passwordExpiryDaysText, performanceSchema, receiptSchema, userSchema, passwordText } from "@/lib/validation";

type Tx = {
  insert: ReturnType<typeof getDb>["insert"];
  update: ReturnType<typeof getDb>["update"];
  delete: ReturnType<typeof getDb>["delete"];
  select: ReturnType<typeof getDb>["select"];
};

class ActionValidationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

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

function assertUuidList(values: string[], label: string) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (values.some((item) => !uuidPattern.test(item))) {
    throw new Error(`${label} is not valid.`);
  }
}

function actionError(path: string, error: unknown): never {
  console.error(`[action:${path}]`, error);
  if (error instanceof ActionValidationError) redirect(`${path}?error=${error.code}`);
  redirect(`${path}?error=transaction`);
}

function buildDimensions(formData: FormData) {
  const parts = [
    ["Length", value(formData, "lengthValue"), value(formData, "lengthUnit")],
    ["Diameter", value(formData, "diameterValue"), value(formData, "diameterUnit")],
    ["Particle", value(formData, "particleSizeValue"), value(formData, "particleSizeUnit")]
  ];

  return parts
    .filter(([, amount]) => amount)
    .map(([label, amount, unit]) => `${label}: ${amount} ${unit}`.trim())
    .join(" · ");
}

function buildMasterName(input: { columnType: string; manufacturer: string; partNumber: string; packing: string }) {
  return joined([input.columnType, input.manufacturer, input.partNumber, input.packing]);
}

function joined(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join(" · ");
}

async function currentUser(permission?: Permission) {
  const context = await getAccessContext(permission);
  return { id: context.id, roles: context.roles };
}

async function findMasterByPartNumber(tx: Tx, input: { columnType: string; manufacturer: string; partNumber: string }, exceptId?: string) {
  const [normalizedType, normalizedManufacturer, normalizedPartNumber] = masterPartKey(input).split("|");
  const where = exceptId
    ? and(
        sql`lower(${columnMasters.columnType}) = ${normalizedType}`,
        sql`lower(${columnMasters.manufacturer}) = ${normalizedManufacturer}`,
        sql`lower(${columnMasters.partNumber}) = ${normalizedPartNumber}`,
        ne(columnMasters.id, exceptId)
      )
    : and(
        sql`lower(${columnMasters.columnType}) = ${normalizedType}`,
        sql`lower(${columnMasters.manufacturer}) = ${normalizedManufacturer}`,
        sql`lower(${columnMasters.partNumber}) = ${normalizedPartNumber}`
      );

  const [duplicate] = await tx.select({ id: columnMasters.id }).from(columnMasters).where(where).limit(1);
  return duplicate;
}

async function verifyElectronicSignature(formData: FormData, actorId: string, input: { action: string; meaning: string }) {
  const password = value(formData, "signaturePassword");
  const reason = value(formData, "signatureReason");
  if (!password) {
    throw new Error("Signature password is required.");
  }
  if (!reason) {
    throw new ActionValidationError("reason_required");
  }

  const [signer] = await getDb()
    .select({ passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  if (!signer?.isActive || !signer.passwordHash) {
    throw new Error("Signature user is not active.");
  }

  const verified = await bcrypt.compare(password, signer.passwordHash);
  if (!verified) {
    throw new Error("Signature password is not valid.");
  }

  return {
    action: input.action,
    meaning: input.meaning,
    reason
  };
}

async function recordElectronicSignature(
  tx: Tx,
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    meaning: string;
    reason: string;
  }
) {
  const [signature] = await tx
    .insert(electronicSignatures)
    .values({
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      meaning: input.meaning,
      reason: input.reason
    })
    .returning();

  await writeAudit(tx, {
    actorId: input.actorId,
    action: "e_signature.applied",
    entityType: input.entityType,
    entityId: input.entityId,
    after: {
      signatureId: signature.id,
      action: input.action,
      meaning: input.meaning
    },
    reason: input.reason
  });

  return signature;
}

function qualificationParametersFromForm(formData: FormData): QualificationParameterInput[] {
  const keys = formData.getAll("parameterKey").map(String);
  const values = formData.getAll("parameterValue").map(String);
  const lows = formData.getAll("parameterLow").map(String);
  const highs = formData.getAll("parameterHigh").map(String);
  const catalogByKey = new Map<string, (typeof qualificationParameterCatalog)[number]>(qualificationParameterCatalog.map((parameter) => [parameter.key, parameter]));

  if (new Set(keys).size !== keys.length) {
    throw new Error("Each performance parameter may only be added once.");
  }

  return keys.map((key, index) => {
    const definition = catalogByKey.get(key);
    if (!definition) throw new Error("Unknown performance parameter.");
    return {
      ...definition,
      applied: true,
      value: optionalNumber(values[index]),
      lowLimit: optionalNumber(lows[index]),
      highLimit: optionalNumber(highs[index])
    };
  });
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

function assertSodAcknowledged(formData: FormData, selectedPermissions: string[]) {
  if (workflowApprovalConflicts(selectedPermissions).length && value(formData, "sodAcknowledged") !== "yes") {
    throw new ActionValidationError("sod_ack_required");
  }
}

async function closeWorkflowRun(tx: Tx, workflowRunId: string | null, status: "completed" | "cancelled") {
  if (!workflowRunId) return;
  await tx.update(workflowRuns).set({ status, updatedAt: new Date() }).where(eq(workflowRuns.id, workflowRunId));
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
  const attachmentTypes = input.formData.getAll("attachmentTypes").map(String).filter(Boolean);
  const requestedTypes = Array.from(new Set(attachmentTypes));
  const filesByCategory = requestedTypes.length
    ? requestedTypes.flatMap((type) => {
        const files = attachmentsFromForm(input.formData, `attachments_${type}`);
        if (!files.length) throw new ActionValidationError("missing_attachment");
        return files.map((file) => ({ file, categories: [type] }));
      })
    : attachmentsFromForm(input.formData).map((file) => ({ file, categories: [] }));
  const rows = [];

  for (const { file, categories } of filesByCategory) {
    const stored = await storeAttachment(file);
    if (!stored) continue;

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

    rows.push(row);
    await writeAudit(tx, {
      actorId: input.uploadedBy,
      action: "attachment.uploaded",
      entityType: input.entityType,
      entityId: input.entityId,
      after: { ...row, categories }
    });
  }

  return rows;
}

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: value(formData, "email"),
      password: value(formData, "password"),
      redirectTo: "/dashboard"
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

function assertPasswordConfirmed(password: string, confirmation: string) {
  if (password !== confirmation) throw new ActionValidationError("password_mismatch");
}

export async function changeOwnPasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasDatabase()) redirect("/dashboard");

  try {
    const currentPassword = value(formData, "currentPassword");
    const newPassword = passwordText.parse(value(formData, "newPassword"));
    assertPasswordConfirmed(newPassword, value(formData, "confirmPassword"));

    const db = getDb();
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (!user?.isActive || !user.passwordHash) throw new Error("User is not active.");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ActionValidationError("invalid_current_password");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({ passwordHash, passwordChangedAt: new Date(), passwordResetRequired: false })
        .where(eq(users.id, user.id))
        .returning();
      await writeAudit(tx, {
        actorId: user.id,
        action: "user.password_changed",
        entityType: "user",
        entityId: user.id,
        after: { id: updatedUser.id, passwordChangedAt: updatedUser.passwordChangedAt }
      });
    });
  } catch (error) {
    actionError("/change-password", error);
  }

  revalidatePath("/settings");
  redirect("/dashboard");
}

export async function resetForgottenPasswordAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  if (!hasDatabase()) redirect("/login?error=invalid");

  try {
    const newPassword = passwordText.parse(value(formData, "newPassword"));
    assertPasswordConfirmed(newPassword, value(formData, "confirmPassword"));
    if (!verifyCaptcha(value(formData, "captchaToken"), value(formData, "captchaAnswer"))) {
      throw new ActionValidationError("captcha_failed");
    }
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, isActive: users.isActive, securityAnswerHash: users.securityAnswerHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user?.isActive || !user.securityAnswerHash) throw new ActionValidationError("reset_failed");
    const answerValid = await bcrypt.compare(normalizeSecurityAnswer(value(formData, "securityAnswer")), user.securityAnswerHash);
    if (!answerValid) throw new ActionValidationError("reset_failed");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({ passwordHash, passwordChangedAt: new Date(), passwordResetRequired: false })
        .where(eq(users.id, user.id))
        .returning();
      await writeAudit(tx, {
        actorId: user.id,
        action: "user.password_reset",
        entityType: "user",
        entityId: user.id,
        after: { id: updatedUser.id, passwordChangedAt: updatedUser.passwordChangedAt }
      });
    });
  } catch (error) {
    console.error("[action:/forgot-password]", error);
    if (error instanceof ActionValidationError) redirect(`/forgot-password?email=${encodeURIComponent(email)}&error=${error.code}`);
    redirect(`/forgot-password?email=${encodeURIComponent(email)}&error=transaction`);
  }

  redirect("/login?success=password_reset");
}

export async function updatePasswordPolicyAction(formData: FormData) {
  const user = await currentUser("settings:update");
  try {
    const expiryDays = passwordExpiryDaysText.parse(value(formData, "expiryDays"));
    if (hasDatabase()) {
      const db = getDb();
      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "password_policy.updated",
        meaning: "Update password expiry policy"
      });
      await db.transaction(async (tx) => {
        const [before] = await tx.select().from(appSettings).where(eq(appSettings.key, passwordExpirySettingKey)).limit(1);
        const [after] = await tx
          .insert(appSettings)
          .values({ key: passwordExpirySettingKey, value: expiryDays, updatedBy: user.id, updatedAt: new Date() })
          .onConflictDoUpdate({ target: appSettings.key, set: { value: expiryDays, updatedBy: user.id, updatedAt: new Date() } })
          .returning();
        await writeAudit(tx, {
          actorId: user.id,
          action: "password_policy.updated",
          entityType: "app_setting",
          entityId: passwordExpirySettingKey,
          before,
          after,
          reason: "Password policy"
        });
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "app_setting", entityId: passwordExpirySettingKey, ...signature });
      });
    }
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect("/settings?section=password-policy&success=settings_updated");
}

export async function updateDisplaySettingAction(formData: FormData) {
  const user = await currentUser("settings:update");
  try {
    const dateFormat = dateFormatText.parse(value(formData, "dateFormat"));
    if (hasDatabase()) {
      const db = getDb();
      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "display_settings.updated",
        meaning: "Update display settings"
      });
      await db.transaction(async (tx) => {
        const [before] = await tx.select().from(appSettings).where(eq(appSettings.key, dateFormatSettingKey)).limit(1);
        const [after] = await tx
          .insert(appSettings)
          .values({ key: dateFormatSettingKey, value: dateFormat, updatedBy: user.id, updatedAt: new Date() })
          .onConflictDoUpdate({ target: appSettings.key, set: { value: dateFormat, updatedBy: user.id, updatedAt: new Date() } })
          .returning();
        await writeAudit(tx, {
          actorId: user.id,
          action: "display_settings.updated",
          entityType: "app_setting",
          entityId: dateFormatSettingKey,
          before,
          after,
          reason: "Display settings"
        });
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "app_setting", entityId: dateFormatSettingKey, ...signature });
      });
    }
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect("/settings?section=display&success=settings_updated");
}

export async function updateUserRecoveryAction(formData: FormData) {
  const actor = await currentUser("settings:update");
  try {
    const userId = value(formData, "userId");
    assertUuidList([userId], "User");
    const securityQuestion = value(formData, "securityQuestion");
    const securityAnswer = normalizeSecurityAnswer(value(formData, "securityAnswer"));
    if (!securityQuestion || !securityAnswer) throw new Error("Recovery question and answer are required.");

    if (hasDatabase()) {
      const db = getDb();
      const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!target) throw new Error("User not found.");
      const signature = await verifyElectronicSignature(formData, actor.id, {
        action: "user.recovery_updated",
        meaning: "Update user recovery details"
      });
      const securityAnswerHash = await bcrypt.hash(securityAnswer, 12);
      await db.transaction(async (tx) => {
        const [updatedUser] = await tx
          .update(users)
          .set({
            securityQuestion,
            securityAnswerHash,
            passwordResetRequired: value(formData, "passwordResetRequired") === "yes"
          })
          .where(eq(users.id, userId))
          .returning();
        await writeAudit(tx, {
          actorId: actor.id,
          action: "user.recovery_updated",
          entityType: "user",
          entityId: userId,
          before: { id: target.id, securityQuestion: target.securityQuestion, passwordResetRequired: target.passwordResetRequired },
          after: { id: updatedUser.id, securityQuestion: updatedUser.securityQuestion, passwordResetRequired: updatedUser.passwordResetRequired },
          reason: "User administration"
        });
        await recordElectronicSignature(tx, { actorId: actor.id, entityType: "user", entityId: userId, ...signature });
      });
    }
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect("/settings?success=settings_updated");
}

export async function createRoleAction(formData: FormData) {
  const user = await currentUser("settings:update");
  try {
    const name = value(formData, "name");
    const roleKey = roleKeyFromName(name);
    const selectedPermissions = formData.getAll("permissions").map(String).filter(Boolean);
    assertSodAcknowledged(formData, selectedPermissions);

    if (!name || !roleKey) {
      throw new Error("Role name is required.");
    }

    if (hasDatabase()) {
      const db = getDb();
      const [existingRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, roleKey)).limit(1);
      if (existingRole) throw new ActionValidationError("transaction");

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "role.created",
        meaning: "Create controlled role"
      });
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
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "role", entityId: role.id, ...signature });
      });
    }
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect("/settings?success=settings_updated");
}

export async function updateRolePermissionsAction(formData: FormData) {
  const user = await currentUser("settings:update");
  try {
    const roleId = value(formData, "roleId");
    const selectedPermissions = formData.getAll("permissions").map(String).filter(Boolean);
    assertSodAcknowledged(formData, selectedPermissions);

    if (!roleId) {
      throw new Error("Role is required.");
    }

    if (hasDatabase()) {
      const db = getDb();
      const [roleCheck] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!roleCheck) throw new Error("Role not found.");

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "role.permissions_updated",
        meaning: "Change role rights"
      });
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
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "role", entityId: roleId, ...signature });
      });
    }
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect("/settings?success=settings_updated");
}

export async function deleteRoleAction(formData: FormData) {
  const user = await currentUser("settings:update");
  try {
    throw new Error(`Deletion is disabled for controlled records by ${user.id}.`);
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect("/settings?success=settings_updated");
}

export async function createUserAction(formData: FormData) {
  const actor = await currentUser("settings:update");
  try {
    const parsed = userSchema.parse({
      name: value(formData, "name"),
      email: value(formData, "email").toLowerCase(),
      password: value(formData, "password"),
      securityQuestion: value(formData, "securityQuestion"),
      securityAnswer: value(formData, "securityAnswer"),
      isActive: value(formData, "isActive") || "yes"
    });
    const selectedRoleIds = formData.getAll("roleIds").map(String).filter(Boolean);

    if (!selectedRoleIds.length) {
      throw new Error("At least one role is required.");
    }
    assertUuidList(selectedRoleIds, "Selected role");

    if (hasDatabase()) {
      const db = getDb();
      const roleRows = await db.select().from(roles).where(inArray(roles.id, selectedRoleIds));
      if (roleRows.length !== selectedRoleIds.length) {
        throw new Error("Selected role is not available.");
      }
      const assignedPermissionRows = await db
        .select({ key: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, selectedRoleIds));
      assertSodAcknowledged(formData, assignedPermissionRows.map((permission) => permission.key));

      const signature = await verifyElectronicSignature(formData, actor.id, {
        action: "user.created",
        meaning: "Create user account"
      });
      await db.transaction(async (tx) => {
        const passwordHash = await bcrypt.hash(parsed.password, 12);
        const securityAnswerHash = await bcrypt.hash(normalizeSecurityAnswer(parsed.securityAnswer), 12);
        const [createdUser] = await tx
          .insert(users)
          .values({
            name: parsed.name,
            email: parsed.email,
            passwordHash,
            securityQuestion: parsed.securityQuestion,
            securityAnswerHash,
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
        await recordElectronicSignature(tx, { actorId: actor.id, entityType: "user", entityId: createdUser.id, ...signature });
      });
    }
  } catch (error) {
    actionError("/settings", error);
  }

  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect("/settings?success=settings_updated");
}

export async function createMasterAction(formData: FormData) {
  const user = await currentUser("masters:create");
  try {
    const dimensions = buildDimensions(formData);
    const columnType = value(formData, "columnType");
    const manufacturer = value(formData, "manufacturer");
    const partNumber = value(formData, "partNumber");
    const packing = value(formData, "packing");
    const parsed = masterSchema.parse({
      name: buildMasterName({ columnType, manufacturer, partNumber, packing }),
      columnType,
      manufacturer,
      partNumber,
      lengthValue: value(formData, "lengthValue"),
      lengthUnit: value(formData, "lengthUnit"),
      diameterValue: value(formData, "diameterValue"),
      diameterUnit: value(formData, "diameterUnit"),
      particleSizeValue: value(formData, "particleSizeValue"),
      particleSizeUnit: value(formData, "particleSizeUnit"),
      packing,
      dimensions,
      remarks: value(formData, "remarks")
    });
    const { remarks, ...masterInput } = parsed;

    if (!hasDatabase()) throw new ActionValidationError("database_required");

    if (hasDatabase()) {
      const db = getDb();
      const duplicate = await findMasterByPartNumber(db, parsed);
      if (duplicate) {
        await writeAudit(db, {
          actorId: user.id,
          action: "master.duplicate_rejected",
          entityType: "column_master",
          entityId: parsed.partNumber,
          after: { duplicateId: duplicate.id, partNumber: parsed.partNumber },
          reason: remarks || "Duplicate part number"
        });
        throw new ActionValidationError("duplicate_part_number");
      }

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "master.submitted",
        meaning: "Submit column master for activation"
      });
      await db.transaction(async (tx) => {
        const [master] = await tx
          .insert(columnMasters)
          .values({
            ...masterInput,
            status: "pending_review",
            parameterTemplate: [],
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
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "column_master", entityId: master.id, ...signature });
      });
    }
  } catch (error) {
    actionError("/masters", error);
  }

  revalidatePath("/masters");
  revalidatePath("/dashboard");
  revalidatePath("/reviews");
  revalidatePath("/audit");
  redirect("/masters?success=master_submitted");
}

export async function updateMasterAction(formData: FormData) {
  const user = await currentUser("masters:update");
  try {
    const masterId = value(formData, "masterId");
    if (!masterId) throw new ActionValidationError("transaction");

    const dimensions = buildDimensions(formData);
    const columnType = value(formData, "columnType");
    const manufacturer = value(formData, "manufacturer");
    const partNumber = value(formData, "partNumber");
    const packing = value(formData, "packing");
    const parsed = masterSchema.parse({
      name: buildMasterName({ columnType, manufacturer, partNumber, packing }),
      columnType,
      manufacturer,
      partNumber,
      lengthValue: value(formData, "lengthValue"),
      lengthUnit: value(formData, "lengthUnit"),
      diameterValue: value(formData, "diameterValue"),
      diameterUnit: value(formData, "diameterUnit"),
      particleSizeValue: value(formData, "particleSizeValue"),
      particleSizeUnit: value(formData, "particleSizeUnit"),
      packing,
      dimensions,
      remarks: value(formData, "remarks")
    });
    const { remarks, ...masterInput } = parsed;

    if (!hasDatabase()) throw new ActionValidationError("database_required");

    if (hasDatabase()) {
      const db = getDb();
      const [before] = await db.select().from(columnMasters).where(eq(columnMasters.id, masterId)).limit(1);
      if (!before) throw new Error("Column master not found.");
      if (before.status !== "draft" && before.status !== "pending_review") throw new ActionValidationError("master_locked");

      const duplicate = await findMasterByPartNumber(db, parsed, masterId);
      if (duplicate) {
        await writeAudit(db, {
          actorId: user.id,
          action: "master.update_duplicate_rejected",
          entityType: "column_master",
          entityId: masterId,
          after: { duplicateId: duplicate.id, partNumber: parsed.partNumber },
          reason: remarks || "Duplicate part number"
        });
        throw new ActionValidationError("duplicate_part_number");
      }

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "master.updated",
        meaning: "Update column master details"
      });
      await db.transaction(async (tx) => {
        const [current] = await tx.select().from(columnMasters).where(eq(columnMasters.id, masterId)).limit(1);
        if (!current) throw new Error("Column master not found.");
        if (current.status !== "draft" && current.status !== "pending_review") throw new ActionValidationError("master_locked");

        const [after] = await tx
          .update(columnMasters)
          .set({
            ...masterInput,
            status: current.status === "draft" ? "pending_review" : current.status,
            updatedBy: user.id,
            updatedAt: new Date()
          })
          .where(eq(columnMasters.id, masterId))
          .returning();

        await writeAudit(tx, {
          actorId: user.id,
          action: "master.updated",
          entityType: "column_master",
          entityId: masterId,
          before: current,
          after,
          reason: remarks
        });
        if (current.status === "draft") {
          await startReview(tx, {
            module: "masters",
            entityType: "column_master",
            entityId: masterId,
            step: "Master activation",
            assignedPermission: "masters:approve",
            requestedBy: user.id
          });
          await writeAudit(tx, {
            actorId: user.id,
            action: "master.resubmitted",
            entityType: "column_master",
            entityId: masterId,
            before: current,
            after,
            reason: remarks || "Returned master corrected"
          });
        }
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "column_master", entityId: masterId, ...signature });
      });
    }
  } catch (error) {
    actionError("/masters", error);
  }

  revalidatePath("/masters");
  revalidatePath("/dashboard");
  revalidatePath("/audit");
  redirect("/masters?success=master_updated");
}

export async function inactivateMasterAction(formData: FormData) {
  const user = await currentUser("masters:inactivate");
  try {
    const masterId = value(formData, "masterId");
    if (!masterId) throw new ActionValidationError("transaction");
    if (!hasDatabase()) throw new ActionValidationError("database_required");

    const db = getDb();
    const [precheck] = await db.select().from(columnMasters).where(eq(columnMasters.id, masterId)).limit(1);
    if (!precheck || precheck.status !== "active") throw new ActionValidationError("transaction");

    const signature = await verifyElectronicSignature(formData, user.id, {
      action: "master.inactivated",
      meaning: "Inactivate column master"
    });
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(columnMasters).where(eq(columnMasters.id, masterId)).limit(1);
      if (!before || before.status !== "active") throw new ActionValidationError("transaction");
      const [after] = await tx
        .update(columnMasters)
        .set({ status: "retired", updatedBy: user.id, updatedAt: new Date() })
        .where(eq(columnMasters.id, masterId))
        .returning();
      await writeAudit(tx, {
        actorId: user.id,
        action: "master.inactivated",
        entityType: "column_master",
        entityId: masterId,
        before,
        after,
        reason: signature.reason
      });
      await recordElectronicSignature(tx, { actorId: user.id, entityType: "column_master", entityId: masterId, ...signature });
    });
  } catch (error) {
    actionError("/masters", error);
  }

  revalidatePath("/masters");
  revalidatePath("/receipt");
  revalidatePath("/dashboard");
  revalidatePath("/audit");
  redirect("/masters?success=master_inactivated");
}

export async function createReceiptAction(formData: FormData) {
  const user = await currentUser("receipt:create");
  try {
    const parsed = receiptSchema.parse({
      columnMasterId: value(formData, "columnMasterId"),
      serialNumber: value(formData, "serialNumber"),
      supplier: value(formData, "supplier"),
      poNumber: value(formData, "poNumber"),
      receivedDate: value(formData, "receivedDate"),
      storageLocation: value(formData, "storageLocation"),
      condition: value(formData, "condition"),
      remarks: value(formData, "remarks")
    });
    const requestedAssetCode = value(formData, "assetCode");
    if (!requestedAssetCode) throw new ActionValidationError("column_id_required");

    if (hasDatabase()) {
      const db = getDb();
      const [masterCheck] = await db.select().from(columnMasters).where(eq(columnMasters.id, parsed.columnMasterId)).limit(1);
      if (!masterCheck || masterCheck.status !== "active") {
        throw new Error("Column master is not active.");
      }

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "receipt.submitted",
        meaning: "Submit column receipt"
      });
      await db.transaction(async (tx) => {
        const [master] = await tx.select().from(columnMasters).where(eq(columnMasters.id, parsed.columnMasterId)).limit(1);
        if (!master || master.status !== "active") {
          throw new Error("Column master is not active.");
        }

        const [claimedCode] = await tx
          .update(columnIdPool)
          .set({ status: "used", usedAt: new Date() })
          .where(and(eq(columnIdPool.code, requestedAssetCode), eq(columnIdPool.status, "available")))
          .returning();
        if (!claimedCode) {
          throw new ActionValidationError("column_id_unavailable");
        }

        const [unit] = await tx
          .insert(columnUnits)
          .values({
            assetCode: claimedCode.code,
            serialNumber: parsed.serialNumber,
            masterId: parsed.columnMasterId,
            status: "pending_receipt_review",
            storageLocation: parsed.storageLocation,
            receivedAt: dateValue(parsed.receivedDate)
          })
          .returning();
        await tx.update(columnIdPool).set({ usedByColumnUnitId: unit.id }).where(eq(columnIdPool.id, claimedCode.id));

        const [receipt] = await tx
          .insert(receipts)
          .values({
            columnUnitId: unit.id,
            columnMasterId: parsed.columnMasterId,
            supplier: parsed.supplier,
            serialNumber: parsed.serialNumber,
            poNumber: parsed.poNumber,
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
          after: {
            ...receipt,
            masterSnapshot: {
              columnType: master.columnType,
              manufacturer: master.manufacturer,
              packing: master.packing,
              dimensions: master.dimensions
            }
          },
          reason: parsed.remarks
        });
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "receipt", entityId: receipt.id, ...signature });
      });
    }
  } catch (error) {
    actionError("/receipt", error);
  }

  revalidatePath("/receipt");
  revalidatePath("/reviews");
  redirect("/reviews?success=receipt_submitted");
}

export async function updateReceiptAction(formData: FormData) {
  const user = await currentUser("receipt:update");
  try {
    const receiptId = value(formData, "receiptId");
    if (!receiptId) throw new ActionValidationError("transaction");

    const parsed = receiptSchema.parse({
      columnMasterId: value(formData, "columnMasterId"),
      serialNumber: value(formData, "serialNumber"),
      supplier: value(formData, "supplier"),
      poNumber: value(formData, "poNumber"),
      receivedDate: value(formData, "receivedDate"),
      storageLocation: value(formData, "storageLocation"),
      condition: value(formData, "condition"),
      remarks: value(formData, "remarks")
    });

    if (!hasDatabase()) throw new ActionValidationError("database_required");

    const db = getDb();
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, receiptId)).limit(1);
    if (!receipt || receipt.status !== "returned" || receipt.columnMasterId !== parsed.columnMasterId || !receipt.columnUnitId) {
      throw new ActionValidationError("transaction");
    }

    const signature = await verifyElectronicSignature(formData, user.id, {
      action: "receipt.resubmitted",
      meaning: "Resubmit returned receipt"
    });

    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(receipts).where(eq(receipts.id, receiptId)).limit(1);
      if (!before || before.status !== "returned" || !before.columnUnitId || before.columnMasterId !== parsed.columnMasterId) {
        throw new ActionValidationError("transaction");
      }

      const [unitBefore] = await tx.select().from(columnUnits).where(eq(columnUnits.id, before.columnUnitId)).limit(1);
      if (!unitBefore || unitBefore.status !== "received_draft") throw new ActionValidationError("transaction");
      await tx
        .update(columnUnits)
        .set({
          serialNumber: parsed.serialNumber,
          status: "pending_receipt_review",
          storageLocation: parsed.storageLocation,
          receivedAt: dateValue(parsed.receivedDate),
          updatedAt: new Date()
        })
        .where(eq(columnUnits.id, before.columnUnitId));

      const [after] = await tx
        .update(receipts)
        .set({
          supplier: parsed.supplier,
          serialNumber: parsed.serialNumber,
          poNumber: parsed.poNumber,
          receivedDate: dateValue(parsed.receivedDate),
          storageLocation: parsed.storageLocation,
          condition: parsed.condition,
          status: "pending_review",
          remarks: parsed.remarks,
          updatedAt: new Date()
        })
        .where(eq(receipts.id, receiptId))
        .returning();

      await startReview(tx, {
        module: "receipt",
        entityType: "receipt",
        entityId: receiptId,
        step: "Receipt acceptance",
        assignedPermission: "receipt:approve",
        requestedBy: user.id
      });
      await insertAttachment(tx, { formData, entityType: "receipt", entityId: receiptId, uploadedBy: user.id });
      await writeAudit(tx, {
        actorId: user.id,
        action: "receipt.resubmitted",
        entityType: "receipt",
        entityId: receiptId,
        before: { receipt: before, unit: unitBefore },
        after,
        reason: parsed.remarks
      });
      await recordElectronicSignature(tx, { actorId: user.id, entityType: "receipt", entityId: receiptId, ...signature });
    });
  } catch (error) {
    actionError("/receipt", error);
  }

  revalidatePath("/receipt");
  revalidatePath("/reviews");
  revalidatePath("/audit");
  redirect("/receipt?success=receipt_updated");
}

export async function createIssuanceAction(formData: FormData) {
  const user = await currentUser("issuance:create");
  try {
    const parsed = issuanceSchema.parse({
      columnId: value(formData, "columnId"),
      issueTo: value(formData, "issueTo"),
      purpose: value(formData, "purpose"),
      dedicatedProduct: value(formData, "dedicatedProduct"),
      dedicatedTest: value(formData, "dedicatedTest"),
      remarks: value(formData, "remarks")
    });
    const isDedicated = Boolean(parsed.dedicatedProduct || parsed.dedicatedTest);
    if (parsed.issueTo === user.id) {
      throw new ActionValidationError("self_issuance_blocked");
    }

    if (hasDatabase()) {
      const db = getDb();
      const [columnCheck] = await db.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
      if (!columnCheck || !canIssueColumn(columnCheck.status)) {
        throw new Error("Column is not available for issuance.");
      }
      const [assigneeCheck] = await db
        .select({ id: users.id, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, parsed.issueTo))
        .limit(1);
      if (!assigneeCheck?.isActive) {
        throw new Error("Selected personnel is not active.");
      }

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "issuance.created",
        meaning: "Issue column for use"
      });
      await db.transaction(async (tx) => {
        const [column] = await tx.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
        if (!column || !canIssueColumn(column.status)) {
          throw new Error("Column is not available for issuance.");
        }
        const [assignee] = await tx
          .select({ id: users.id, isActive: users.isActive })
          .from(users)
          .where(eq(users.id, parsed.issueTo))
          .limit(1);
        if (!assignee?.isActive) {
          throw new Error("Selected personnel is not active.");
        }

        const [issuedColumn] = await tx
          .update(columnUnits)
          .set({
            status: "issued",
            currentHolderId: parsed.issueTo,
            dedicatedProduct: parsed.dedicatedProduct || null,
            dedicatedTest: parsed.dedicatedTest || null,
            dedicatedAt: isDedicated ? new Date() : null
          })
          .where(and(eq(columnUnits.id, parsed.columnId), eq(columnUnits.status, "available")))
          .returning();
        if (!issuedColumn) {
          throw new Error("Column is no longer available for issuance.");
        }

        const [issuance] = await tx
          .insert(issuances)
          .values({
            columnUnitId: parsed.columnId,
            issueToId: parsed.issueTo,
            issueDate: new Date(),
            purpose: parsed.purpose,
            isDedicated,
            dedicatedProduct: parsed.dedicatedProduct,
            dedicatedTest: parsed.dedicatedTest,
            status: "issued",
            remarks: parsed.remarks,
            createdBy: user.id
          })
          .returning();
        await writeAudit(tx, {
          actorId: user.id,
          action: "issuance.created",
          entityType: "issuance",
          entityId: issuance.id,
          before: column,
          after: issuance,
          reason: parsed.remarks
        });
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "issuance", entityId: issuance.id, ...signature });
      });
    }
  } catch (error) {
    actionError("/issuance", error);
  }

  revalidatePath("/issuance");
  redirect("/issuance?success=issuance_created");
}

export async function createPerformanceAction(formData: FormData) {
  const user = await currentUser("performance:create");
  let successRedirect = "/performance?success=performance_recorded";
  try {
    const parsed = performanceSchema.parse({
      columnId: value(formData, "columnId"),
      method: value(formData, "method"),
      performedDate: value(formData, "performedDate"),
      remarks: value(formData, "remarks")
    });
    const qualification = evaluatePerformanceQualification(qualificationParametersFromForm(formData));
    if (qualification.result === "fail") {
      successRedirect = "/reviews?success=performance_submitted";
    }

    if (hasDatabase()) {
      const db = getDb();
      const [columnCheck] = await db.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
      if (!columnCheck || !canRecordPerformance(columnCheck.status)) {
        throw new Error("Column is not issued for performance entry.");
      }

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "performance.recorded",
        meaning: "Record performance qualification"
      });
      await db.transaction(async (tx) => {
        const [column] = await tx.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
        if (!column || !canRecordPerformance(column.status)) {
          throw new Error("Column is not issued for performance entry.");
        }

        const status = qualification.result === "pass" ? "recorded" : "pending_review";
        const [entry] = await tx
          .insert(performanceEntries)
          .values({
            columnUnitId: parsed.columnId,
            method: parsed.method,
            performedDate: dateValue(parsed.performedDate),
            values: {
              parameters: qualification.parameters
            },
            criteria: {
              parameters: qualification.parameters.map(({ key, label, unit, lowLimit, highLimit }) => ({ key, label, unit, lowLimit, highLimit }))
            },
            result: qualification.result,
            status,
            remarks: parsed.remarks,
            createdBy: user.id
          })
          .returning();

        if (qualification.result === "pass") {
          await tx.update(columnUnits).set({ status: "available" }).where(eq(columnUnits.id, parsed.columnId));
        }

        if (qualification.result === "fail") {
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
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "performance", entityId: entry.id, ...signature });
      });
    }
  } catch (error) {
    actionError("/performance", error);
  }

  revalidatePath("/performance");
  revalidatePath("/reviews");
  redirect(successRedirect);
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
      const [columnCheck] = await db.select().from(columnUnits).where(eq(columnUnits.id, parsed.columnId)).limit(1);
      if (!columnCheck || !canRequestDestruction(columnCheck.status)) {
        throw new Error("Column is not eligible for destruction.");
      }

      const signature = await verifyElectronicSignature(formData, user.id, {
        action: "destruction.requested",
        meaning: "Request column discard"
      });
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
        await recordElectronicSignature(tx, { actorId: user.id, entityType: "destruction", entityId: destruction.id, ...signature });
      });
    }
  } catch (error) {
    actionError("/destruction", error);
  }

  revalidatePath("/destruction");
  revalidatePath("/reviews");
  redirect("/reviews?success=destruction_requested");
}

export async function approveTaskAction(formData: FormData) {
  try {
    const taskId = value(formData, "taskId");
    const sessionUser = await currentUser("reviews:read");

    if (hasDatabase()) {
      const db = getDb();
      const [taskForSignature] = await db.select().from(approvalTasks).where(eq(approvalTasks.id, taskId)).limit(1);
      if (!taskForSignature || taskForSignature.status !== "pending") {
        throw new Error("Review task is not pending.");
      }
      if (taskForSignature.requestedBy === sessionUser.id) {
        throw new ActionValidationError("self_review_blocked");
      }
      await currentUser(taskForSignature.assignedPermission as Permission);

      const signature = await verifyElectronicSignature(formData, sessionUser.id, {
        action: "review.approved",
        meaning: "Approve controlled workflow step"
      });
      await db.transaction(async (tx) => {
        const [task] = await tx.select().from(approvalTasks).where(eq(approvalTasks.id, taskId)).limit(1);
        if (!task || task.status !== "pending") {
          throw new Error("Review task is not pending.");
        }
        if (task.requestedBy === sessionUser.id) {
          throw new ActionValidationError("self_review_blocked");
        }

        const [completedTask] = await tx.update(approvalTasks).set({ status: "approved", completedBy: sessionUser.id, completedAt: new Date() }).where(eq(approvalTasks.id, taskId)).returning();
        await closeWorkflowRun(tx, task.workflowRunId, "completed");
        await writeAudit(tx, {
          actorId: sessionUser.id,
          action: "review.approved",
          entityType: task.entityType,
          entityId: task.entityId,
          before: task,
          after: completedTask,
          reason: task.step
        });
        await recordElectronicSignature(tx, {
          actorId: sessionUser.id,
          entityType: task.entityType,
          entityId: task.entityId,
          ...signature,
          reason: signature.reason || task.step
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

        if (task.entityType === "performance") {
          const [before] = await tx.select().from(performanceEntries).where(eq(performanceEntries.id, task.entityId)).limit(1);
          const [after] = await tx.update(performanceEntries).set({ status: "approved" }).where(eq(performanceEntries.id, task.entityId)).returning();
          await writeAudit(tx, {
            actorId: sessionUser.id,
            action: "performance.approved",
            entityType: "performance",
            entityId: task.entityId,
            before,
            after,
            reason: task.step
          });
        }

        if (task.entityType === "destruction" && task.assignedPermission === "destruction:review") {
          const [before] = await tx.select().from(destructions).where(eq(destructions.id, task.entityId)).limit(1);
          const [after] = await tx
            .update(destructions)
            .set({ reviewerApprovedBy: sessionUser.id, status: "pending_review" })
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
            step: "Final approval",
            assignedPermission: "destruction:approve",
            requestedBy: sessionUser.id
          });
        }

        if (task.entityType === "destruction" && task.assignedPermission === "destruction:approve") {
          const now = new Date();
          const [before] = await tx.select().from(destructions).where(eq(destructions.id, task.entityId)).limit(1);
          const [destruction] = await tx
            .update(destructions)
            .set({ finalApprovedBy: sessionUser.id, status: "destroyed", destroyedAt: now })
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
  revalidatePath("/performance");
  revalidatePath("/destruction");
  revalidatePath("/audit");
  redirect("/reviews?success=review_approved");
}

export async function returnTaskAction(formData: FormData) {
  try {
    const taskId = value(formData, "taskId");
    const sessionUser = await currentUser("reviews:read");

    if (hasDatabase()) {
      const db = getDb();
      const [taskForSignature] = await db.select().from(approvalTasks).where(eq(approvalTasks.id, taskId)).limit(1);
      if (!taskForSignature || taskForSignature.status !== "pending") {
        throw new Error("Review task is not pending.");
      }
      if (taskForSignature.requestedBy === sessionUser.id) {
        throw new ActionValidationError("self_review_blocked");
      }
      await currentUser(taskForSignature.assignedPermission as Permission);

      const signature = await verifyElectronicSignature(formData, sessionUser.id, {
        action: "review.returned",
        meaning: "Return controlled workflow step for correction"
      });

      await db.transaction(async (tx) => {
        const [task] = await tx.select().from(approvalTasks).where(eq(approvalTasks.id, taskId)).limit(1);
        if (!task || task.status !== "pending") {
          throw new Error("Review task is not pending.");
        }
        if (task.requestedBy === sessionUser.id) {
          throw new ActionValidationError("self_review_blocked");
        }

        const [completedTask] = await tx.update(approvalTasks).set({ status: "returned", completedBy: sessionUser.id, completedAt: new Date() }).where(eq(approvalTasks.id, taskId)).returning();
        await closeWorkflowRun(tx, task.workflowRunId, "cancelled");
        await writeAudit(tx, {
          actorId: sessionUser.id,
          action: "review.returned",
          entityType: task.entityType,
          entityId: task.entityId,
          before: task,
          after: completedTask,
          reason: signature.reason
        });
        await recordElectronicSignature(tx, {
          actorId: sessionUser.id,
          entityType: task.entityType,
          entityId: task.entityId,
          ...signature
        });

        if (task.entityType === "column_master") {
          const [before] = await tx.select().from(columnMasters).where(eq(columnMasters.id, task.entityId)).limit(1);
          const [after] = await tx.update(columnMasters).set({ status: "draft", updatedBy: sessionUser.id }).where(eq(columnMasters.id, task.entityId)).returning();
          await writeAudit(tx, { actorId: sessionUser.id, action: "master.returned", entityType: "column_master", entityId: task.entityId, before, after, reason: signature.reason });
        }

        if (task.entityType === "receipt") {
          const [before] = await tx.select().from(receipts).where(eq(receipts.id, task.entityId)).limit(1);
          const [after] = await tx.update(receipts).set({ status: "returned" }).where(eq(receipts.id, task.entityId)).returning();
          await writeAudit(tx, { actorId: sessionUser.id, action: "receipt.returned", entityType: "receipt", entityId: task.entityId, before, after, reason: signature.reason });
          if (before?.columnUnitId) {
            await tx.update(columnUnits).set({ status: "received_draft" }).where(eq(columnUnits.id, before.columnUnitId));
          }
        }

        if (task.entityType === "performance") {
          const [before] = await tx.select().from(performanceEntries).where(eq(performanceEntries.id, task.entityId)).limit(1);
          const [after] = await tx.update(performanceEntries).set({ status: "returned" }).where(eq(performanceEntries.id, task.entityId)).returning();
          await writeAudit(tx, { actorId: sessionUser.id, action: "performance.returned", entityType: "performance", entityId: task.entityId, before, after, reason: signature.reason });
        }

        if (task.entityType === "destruction") {
          const [before] = await tx.select().from(destructions).where(eq(destructions.id, task.entityId)).limit(1);
          const [after] = await tx.update(destructions).set({ status: "returned" }).where(eq(destructions.id, task.entityId)).returning();
          await writeAudit(tx, { actorId: sessionUser.id, action: "destruction.returned", entityType: "destruction", entityId: task.entityId, before, after, reason: signature.reason });
          if (before?.columnUnitId) {
            await tx.update(columnUnits).set({ status: "available" }).where(eq(columnUnits.id, before.columnUnitId));
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
  revalidatePath("/performance");
  revalidatePath("/destruction");
  revalidatePath("/audit");
  redirect("/reviews?success=review_returned");
}
