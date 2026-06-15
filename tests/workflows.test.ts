import { describe, expect, it } from "vitest";
import { canIssueColumn, canRecordPerformance, canRequestDestruction, defaultWorkflows } from "@/lib/workflows";

describe("workflows", () => {
  it("keeps destruction as a two-approval flow", () => {
    expect(defaultWorkflows.destruction.map((step) => step.key)).toEqual(["requested", "reviewed", "approved", "destroyed"]);
  });

  it("blocks destroyed columns from operational activity", () => {
    expect(canIssueColumn("destroyed")).toBe(false);
    expect(canRecordPerformance("destroyed")).toBe(false);
    expect(canRequestDestruction("destroyed")).toBe(false);
  });
});
