import { z } from "zod";

export const requiredText = z.string().trim().min(1);

export const masterSchema = z.object({
  name: requiredText,
  columnType: requiredText,
  manufacturer: requiredText,
  partNumber: requiredText,
  dimensions: requiredText,
  remarks: z.string().optional()
});

export const receiptSchema = z.object({
  columnMasterId: requiredText,
  serialNumber: requiredText,
  supplier: requiredText,
  receivedDate: requiredText,
  storageLocation: requiredText,
  condition: requiredText,
  remarks: z.string().optional()
});

export const issuanceSchema = z.object({
  columnId: requiredText,
  issueTo: requiredText,
  issueDate: requiredText,
  expectedReturnDate: requiredText,
  purpose: requiredText,
  remarks: z.string().optional()
});

export const performanceSchema = z.object({
  columnId: requiredText,
  method: requiredText,
  performedDate: requiredText,
  result: z.enum(["pass", "fail"]),
  remarks: z.string().optional()
});

export const destructionSchema = z.object({
  columnId: requiredText,
  reason: requiredText,
  requestedDate: requiredText,
  disposalMethod: requiredText,
  remarks: requiredText
});
