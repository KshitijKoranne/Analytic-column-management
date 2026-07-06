// Field catalog for the column-lifecycle register report. Shared by the server (which builds a
// row per column keyed by these ids) and the client report builder (which lets the user pick
// which of these fields to show, filter, and print). Kept free of server imports so it can be
// imported into the client component.
export type ReportFieldId =
  | "assetCode"
  | "columnType"
  | "manufacturer"
  | "partNumber"
  | "packing"
  | "dimensions"
  | "serialNumber"
  | "status"
  | "currentHolder"
  | "storageLocation"
  | "receivedAt"
  | "dedicatedProduct"
  | "dedicatedTest"
  | "lastPerformanceMethod"
  | "lastPerformanceResult"
  | "lastPerformanceDate"
  | "destructionStatus"
  | "destructionReason";

export type ReportField = { id: ReportFieldId; label: string };

export type ReportRow = Record<ReportFieldId, string>;

export const reportFields: ReportField[] = [
  { id: "assetCode", label: "Column ID" },
  { id: "columnType", label: "Column type" },
  { id: "manufacturer", label: "Manufacturer" },
  { id: "partNumber", label: "Part number" },
  { id: "packing", label: "Packing" },
  { id: "dimensions", label: "Dimensions" },
  { id: "serialNumber", label: "Serial number" },
  { id: "status", label: "Status" },
  { id: "currentHolder", label: "Current holder" },
  { id: "storageLocation", label: "Storage location" },
  { id: "receivedAt", label: "Received date" },
  { id: "dedicatedProduct", label: "Dedicated product" },
  { id: "dedicatedTest", label: "Dedicated test" },
  { id: "lastPerformanceMethod", label: "Last performance method" },
  { id: "lastPerformanceResult", label: "Last performance result" },
  { id: "lastPerformanceDate", label: "Last performance date" },
  { id: "destructionStatus", label: "Destruction status" },
  { id: "destructionReason", label: "Destruction reason" }
];

// A sensible starter set so the report isn't blank on first open.
export const defaultReportFieldIds: ReportFieldId[] = ["assetCode", "columnType", "partNumber", "status", "currentHolder", "receivedAt"];
