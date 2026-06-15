import { describe, expect, it } from "vitest";
import { receiptSchema } from "@/lib/validation";

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
});
