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

  it("allows issuance only after performance qualification passes", () => {
    expect(canIssueColumn("available")).toBe(true);
    expect(canIssueColumn("issued")).toBe(false);
    expect(canIssueColumn("performance_pending")).toBe(false);
    expect(canIssueColumn("on_hold")).toBe(false);
  });

  it("allows issued columns to enter the destruction flow", () => {
    expect(canRequestDestruction("issued")).toBe(true);
  });

  it("blocks duplicate destruction requests once review is pending", () => {
    expect(canRequestDestruction("destruction_pending")).toBe(false);
  });

  it("allows performance entry for qualification and retest states", () => {
    expect(canRecordPerformance("performance_pending")).toBe(true);
    expect(canRecordPerformance("on_hold")).toBe(true);
    expect(canRecordPerformance("issued")).toBe(false);
    expect(canRecordPerformance("available")).toBe(false);
  });
});
