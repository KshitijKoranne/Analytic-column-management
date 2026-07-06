import { z } from "zod";

export const requiredText = z.string().trim().min(1).max(250);
export const requiredLongText = z.string().trim().min(1).max(2000);
export const longText = z.string().trim().max(2000).optional().default("");
export const optionalText = z.string().trim().max(250).optional().default("");
export const uuidText = z.uuid();
export const dateText = z.iso.date();
export const passwordText = z.string().min(8).max(128);
export const passwordExpiryDaysText = z.string().trim().refine((value) => {
  const days = Number(value);
  return Number.isInteger(days) && days >= 0 && days <= 3650;
}, "Password expiry must be 0 to 3650 days.");
export const dateFormatText = z.enum(["DD/MM/YY", "DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YY"]);
export const requiredNumberText = z.string().trim().min(1).max(64).refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Positive number is required.");
const dimensionUnit = z.enum(["mm", "cm", "m", "micron", "um"]);

export function masterPartKey(input: { columnType: string; manufacturer: string; partNumber: string }) {
  return [input.columnType, input.manufacturer, input.partNumber].map((part) => part.trim().toLowerCase()).join("|");
}

export const masterSchema = z.object({
  name: requiredText,
  columnType: requiredText,
  manufacturer: requiredText,
  partNumber: requiredText,
  lengthValue: requiredNumberText,
  lengthUnit: dimensionUnit,
  diameterValue: requiredNumberText,
  diameterUnit: dimensionUnit,
  particleSizeValue: requiredNumberText,
  particleSizeUnit: dimensionUnit,
  packing: requiredText,
  dimensions: requiredText,
  remarks: longText
});

export const receiptSchema = z.object({
  columnMasterId: uuidText,
  serialNumber: requiredText,
  supplier: optionalText,
  poNumber: optionalText,
  receivedDate: dateText,
  storageLocation: requiredText,
  condition: z.enum(["Intact", "Damaged"]),
  remarks: longText
});

export const issuanceSchema = z.object({
  columnId: uuidText,
  issueTo: uuidText,
  purpose: requiredText,
  dedicatedProduct: optionalText,
  dedicatedTest: optionalText,
  remarks: longText
});

export const performanceSchema = z.object({
  columnId: uuidText,
  method: requiredText,
  performedDate: dateText,
  remarks: longText
});

export const destructionSchema = z.object({
  columnId: uuidText,
  reason: requiredText,
  requestedDate: dateText,
  disposalMethod: z.enum(["Controlled disposal", "Vendor return", "Waste management"]),
  remarks: requiredLongText
});

export const userSchema = z.object({
  name: requiredText,
  email: z.email().max(250),
  password: passwordText,
  securityQuestion: requiredText,
  securityAnswer: requiredText,
  isActive: z.enum(["yes", "no"]).default("yes")
});
