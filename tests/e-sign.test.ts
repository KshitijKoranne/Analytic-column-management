import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("electronic signatures", () => {
  it("requires remarks in the UI, server action, and database schema", async () => {
    const [component, actions, schema, migration] = await Promise.all([
      source("components/e-sign-fields.tsx"),
      source("app/actions.ts"),
      source("db/schema.ts"),
      source("db/migrations/0006_e_signature_reason_required.sql")
    ]);

    expect(component).toContain("requireReason = true");
    expect(actions).toContain('throw new ActionValidationError("reason_required")');
    expect(schema).toContain('reason: text("reason").notNull()');
    expect(migration).toContain('ALTER COLUMN "reason" SET NOT NULL');
    expect(migration).toContain("electronic_signatures_reason_present");
  });
});

describe("review transitions", () => {
  it("closes failed performance reviews when approved", async () => {
    const actions = await source("app/actions.ts");

    expect(actions).toContain('task.entityType === "performance"');
    expect(actions).toContain('action: "performance.approved"');
    expect(actions).toContain('status: "approved"');
  });
});
