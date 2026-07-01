import { describe, expect, it } from "vitest";
import { permissionGroups, permissionLabels, hasPermission, resolvePermissions, workflowApprovalConflicts } from "@/lib/permissions";
import { permissionHumanLabels } from "@/lib/labels";

describe("permissions", () => {
  it("gives admin every seeded permission", () => {
    expect(resolvePermissions(["admin"]).length).toBe(Object.keys(permissionLabels).length);
    expect(hasPermission(["admin"], "settings:update")).toBe(true);
  });

  it("does not grant removed default roles", () => {
    expect(resolvePermissions(["auditor", "analyst", "manager", "reviewer"])).toEqual([]);
    expect(hasPermission(["auditor"], "audit:read")).toBe(false);
  });

  it("groups every visible permission exactly once", () => {
    const grouped = permissionGroups.flatMap((group) => group.permissions);
    expect(grouped.sort()).toEqual(Object.keys(permissionLabels).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(Object.keys(permissionHumanLabels).sort()).toEqual(Object.keys(permissionLabels).sort());
    expect(permissionGroups.find((group) => group.key === "masters")?.permissions).toContain("masters:inactivate");
  });

  it("detects role mixes that can create and approve the same workflow", () => {
    expect(workflowApprovalConflicts(["masters:create", "masters:approve"])).toEqual(["Masters"]);
    expect(workflowApprovalConflicts(["receipt:create", "performance:approve"])).toEqual([]);
  });
});
