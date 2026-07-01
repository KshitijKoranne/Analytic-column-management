import { describe, expect, it } from "vitest";
import { auditChangeValues, buildDashboardStats, cleanDimensions } from "@/lib/data";
import type { ColumnMaster, ColumnUnit } from "@/lib/types";
import { destructionSchema, issuanceSchema, masterPartKey, masterSchema, receiptSchema, userSchema } from "@/lib/validation";

describe("validation", () => {
  it("keeps packing out of dimensions", () => {
    expect(cleanDimensions("Diameter: 4.6 mm · Packing: C18 · Length: 150 mm")).toBe("Diameter: 4.6 mm · Length: 150 mm");
  });

  it("summarizes audit before and after values for edits", () => {
    expect(auditChangeValues({ status: "draft", partNumber: "P1" }, { status: "pending_review", partNumber: "P1" })).toEqual({
      previousValue: "status: draft",
      nextValue: "status: pending_review"
    });
    expect(auditChangeValues(undefined, { status: "draft" })).toEqual({ previousValue: "NA", nextValue: "NA" });
  });

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
        poNumber: "",
        receivedDate: "16 June",
        storageLocation: "Cabinet A-03",
        condition: "Intact"
      })
    ).toThrow();
  });

  it("does not trust receipt master snapshot fields from the client", () => {
    expect(() =>
      receiptSchema.parse({
        columnMasterId: "018fdd3d-95ef-7fd1-b1d9-9ef017f4082f",
        serialNumber: "SN-001",
        supplier: "Waters India",
        poNumber: "",
        receivedDate: "2026-06-16",
        storageLocation: "QC Store",
        condition: "Intact",
        remarks: ""
      })
    ).not.toThrow();
  });

  it("allows receipt without supplier", () => {
    expect(() =>
      receiptSchema.parse({
        columnMasterId: "018fdd3d-95ef-7fd1-b1d9-9ef017f4082f",
        serialNumber: "SN-001",
        supplier: "",
        poNumber: "",
        receivedDate: "2026-06-16",
        storageLocation: "QC Store",
        condition: "Intact",
        remarks: ""
      })
    ).not.toThrow();
  });

  it("requires destruction remarks", () => {
    expect(() =>
      destructionSchema.parse({
        columnId: "018fdd3d-95ef-7fd1-b1d9-9ef017f4082f",
        reason: "Expired",
        requestedDate: "2026-06-16",
        disposalMethod: "Controlled disposal",
        remarks: ""
      })
    ).toThrow();
  });

  it("accepts a complete destruction request", () => {
    expect(() =>
      destructionSchema.parse({
        columnId: "018fdd3d-95ef-7fd1-b1d9-9ef017f4082f",
        reason: "Expired",
        requestedDate: "2026-06-16",
        disposalMethod: "Controlled disposal",
        remarks: "Documented disposal after expiry."
      })
    ).not.toThrow();
  });

  it("requires an issued-to user id for issuance", () => {
    expect(() =>
      issuanceSchema.parse({
        columnId: "018fdd3d-95ef-7fd1-b1d9-9ef017f4082f",
        issueTo: "QC Analyst",
        issueDate: "2026-06-16",
        purpose: "Assay",
        dedicatedProduct: "",
        dedicatedTest: "",
        remarks: ""
      })
    ).toThrow();
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

  it("requires master part number and dimensions", () => {
    expect(() =>
      masterSchema.parse({
        name: "HPLC · Waters",
        columnType: "HPLC",
        manufacturer: "Waters",
        partNumber: "",
        lengthValue: "150",
        lengthUnit: "mm",
        diameterValue: "4.6",
        diameterUnit: "mm",
        particleSizeValue: "5",
        particleSizeUnit: "micron",
        packing: "C18",
        dimensions: "Diameter: 4.6 mm · Length: 150 mm",
        remarks: ""
      })
    ).toThrow();
  });

  it("rejects non-positive master dimensions and unknown units", () => {
    expect(() =>
      masterSchema.parse({
        name: "HPLC · Waters · 186003062 · C18",
        columnType: "HPLC",
        manufacturer: "Waters",
        partNumber: "186003062",
        lengthValue: "-150",
        lengthUnit: "banana",
        diameterValue: "0",
        diameterUnit: "mm",
        particleSizeValue: "5",
        particleSizeUnit: "micron",
        packing: "C18",
        dimensions: "Diameter: 0 mm · Length: -150 banana",
        remarks: ""
      })
    ).toThrow();
  });

  it("scopes duplicate part numbers by type and manufacturer", () => {
    const watersHplc = masterPartKey({ columnType: "HPLC", manufacturer: "Waters", partNumber: "P-100" });
    expect(masterPartKey({ columnType: "HPLC", manufacturer: "Waters", partNumber: "p-100" })).toBe(watersHplc);
    expect(masterPartKey({ columnType: "UPLC", manufacturer: "Waters", partNumber: "P-100" })).not.toBe(watersHplc);
    expect(masterPartKey({ columnType: "HPLC", manufacturer: "Agilent", partNumber: "P-100" })).not.toBe(watersHplc);
  });

  it("counts accepted dashboard columns from lifecycle status", () => {
    const masters = [
      { id: "m1", name: "A", columnType: "HPLC", manufacturer: "Waters", partNumber: "P1", packing: "C18", dimensions: "150 x 4.6", status: "active", parameterTemplate: [] },
      { id: "m2", name: "B", columnType: "GC", manufacturer: "Agilent", partNumber: "P2", packing: "DB", dimensions: "30 m", status: "pending_review", parameterTemplate: [] }
    ] satisfies ColumnMaster[];
    const columns = [
      { id: "c1", assetCode: "COL-1", serialNumber: "S1", masterId: "m1", status: "available", currentHolder: "QC", storageLocation: "A", receivedAt: "2026-06-28" },
      { id: "c2", assetCode: "COL-2", serialNumber: "S2", masterId: "m2", status: "pending_receipt_review", currentHolder: "QC", storageLocation: "B", receivedAt: "2026-06-28" }
    ] satisfies ColumnUnit[];

    expect(buildDashboardStats(masters, columns)).toMatchObject({
      totalColumns: 2,
      acceptedColumns: 1,
      notAcceptedColumns: 1,
      activeMasters: 1,
      pendingMasters: 1
    });
  });
});
