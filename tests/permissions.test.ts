import { describe, expect, it } from "vitest";
import { hasPermission, resolvePermissions } from "@/lib/permissions";

describe("permissions", () => {
  it("gives admin every seeded permission", () => {
    expect(resolvePermissions(["admin"]).length).toBeGreaterThan(20);
    expect(hasPermission(["admin"], "settings:update")).toBe(true);
  });

  it("keeps auditor read-only", () => {
    expect(hasPermission(["auditor"], "audit:read")).toBe(true);
    expect(hasPermission(["auditor"], "receipt:create")).toBe(false);
  });
});
