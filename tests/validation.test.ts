import { describe, expect, it } from "vitest";
import { destructionSchema, receiptSchema, userSchema } from "@/lib/validation";

describe("validation", () => {
  it("requires core receipt fields", () => {
    expect(() =>
      receiptSchema.parse({
        columnMasterId: "cm-001",
        serialNumber: "",
        supplier: "Waters India",
        receivedDate: "2026-06-15",
        storageLocation: "Cabinet A-03",
        condition: "Intact"
      })
    ).toThrow();
  });

  it("rejects non-date receipt dates", () => {
    expect(() =>
      receiptSchema.parse({
        columnMasterId: "018fdd3d-95ef-7fd1-b1d9-9ef017f4082f",
        serialNumber: "SN-001",
        supplier: "Waters India",
        receivedDate: "16 June",
        storageLocation: "Cabinet A-03",
        condition: "Intact"
      })
    ).toThrow();
  });

  it("allows destruction remarks to be blank", () => {
    expect(() =>
      destructionSchema.parse({
        columnId: "018fdd3d-95ef-7fd1-b1d9-9ef017f4082f",
        reason: "Expired",
        requestedDate: "2026-06-16",
        disposalMethod: "Controlled disposal",
        remarks: ""
      })
    ).not.toThrow();
  });

  it("requires valid user email and password length", () => {
    expect(() =>
      userSchema.parse({
        name: "QC Analyst",
        email: "analyst",
        password: "short",
        isActive: "yes"
      })
    ).toThrow();
  });
});
