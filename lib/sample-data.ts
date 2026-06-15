import type { ActivityRecord, AuditEvent, ColumnMaster, ColumnUnit, ReviewItem } from "@/lib/types";

export const columnMasters: ColumnMaster[] = [
  {
    id: "cm-001",
    name: "C18 Assay Column",
    columnType: "HPLC",
    manufacturer: "Waters",
    partNumber: "186003062",
    dimensions: "250 x 4.6 mm, 5 um",
    status: "active",
    parameterTemplate: [
      { id: "plates", label: "Theoretical plates", unit: "N", inputType: "number", required: true, lowLimit: 2000 },
      { id: "tailing", label: "Tailing factor", unit: "", inputType: "number", required: true, highLimit: 2 },
      { id: "resolution", label: "Resolution", unit: "", inputType: "number", required: true, lowLimit: 2 }
    ]
  },
  {
    id: "cm-002",
    name: "Amino Sugar Column",
    columnType: "UPLC",
    manufacturer: "Agilent",
    partNumber: "959757-902",
    dimensions: "100 x 2.1 mm, 1.8 um",
    status: "active",
    parameterTemplate: [
      { id: "pressure", label: "Pressure", unit: "bar", inputType: "number", required: true, highLimit: 900 },
      { id: "rsd", label: "RSD", unit: "%", inputType: "number", required: true, highLimit: 2 }
    ]
  }
];

export const columnUnits: ColumnUnit[] = [
  {
    id: "cu-001",
    assetCode: "COL-2026-001",
    serialNumber: "WAT-C18-58291",
    masterId: "cm-001",
    status: "available",
    currentHolder: "QC Store",
    storageLocation: "Cabinet A-03",
    receivedAt: "2026-06-12"
  },
  {
    id: "cu-002",
    assetCode: "COL-2026-002",
    serialNumber: "AGL-UPLC-39201",
    masterId: "cm-002",
    status: "issued",
    currentHolder: "Ananya Rao",
    storageLocation: "LC Bay 2",
    receivedAt: "2026-06-14"
  }
];

const attachments = [
  {
    id: "att-001",
    fileName: "CoA-COL-2026-001.pdf",
    mimeType: "application/pdf",
    sizeLabel: "428 KB",
    uploadedBy: "QC Store",
    uploadedAt: "2026-06-12"
  }
];

export const activityRecords: ActivityRecord[] = [
  {
    id: "rec-001",
    module: "receipt",
    title: "COL-2026-001",
    subtitle: "C18 Assay Column",
    status: "accepted",
    owner: "QC Store",
    date: "2026-06-12",
    columnId: "COL-2026-001",
    masterName: "C18 Assay Column",
    attachments
  },
  {
    id: "rec-002",
    module: "receipt",
    title: "COL-2026-003",
    subtitle: "Amino Sugar Column",
    status: "pending_review",
    owner: "Meera Iyer",
    date: "2026-06-15",
    columnId: "COL-2026-003",
    masterName: "Amino Sugar Column",
    attachments: []
  },
  {
    id: "iss-001",
    module: "issuance",
    title: "COL-2026-002",
    subtitle: "Issued to Ananya Rao",
    status: "issued",
    owner: "QC Store",
    date: "2026-06-15",
    columnId: "COL-2026-002",
    masterName: "Amino Sugar Column",
    attachments: []
  },
  {
    id: "perf-001",
    module: "performance",
    title: "COL-2026-002",
    subtitle: "Assay method AM-014",
    status: "recorded",
    owner: "Ananya Rao",
    date: "2026-06-15",
    columnId: "COL-2026-002",
    masterName: "Amino Sugar Column",
    attachments: []
  },
  {
    id: "dest-001",
    module: "destruction",
    title: "COL-2025-119",
    subtitle: "Repeated suitability failure",
    status: "pending_review",
    owner: "Rohan Shah",
    date: "2026-06-14",
    columnId: "COL-2025-119",
    masterName: "C18 Assay Column",
    attachments: []
  }
];

export const reviewItems: ReviewItem[] = [
  {
    id: "rvw-001",
    module: "receipt",
    recordId: "rec-002",
    title: "COL-2026-003",
    requestedBy: "Meera Iyer",
    step: "Receipt acceptance",
    due: "2026-06-16"
  },
  {
    id: "rvw-002",
    module: "destruction",
    recordId: "dest-001",
    title: "COL-2025-119",
    requestedBy: "Rohan Shah",
    step: "Technical review",
    due: "2026-06-16"
  }
];

export const auditEvents: AuditEvent[] = [
  {
    id: "aud-001",
    action: "receipt.accepted",
    entityType: "receipt",
    entityId: "rec-001",
    actor: "Kavita Menon",
    at: "2026-06-12 11:42",
    reason: "Documents verified"
  },
  {
    id: "aud-002",
    action: "issuance.created",
    entityType: "issuance",
    entityId: "iss-001",
    actor: "QC Store",
    at: "2026-06-15 09:18"
  },
  {
    id: "aud-003",
    action: "performance.recorded",
    entityType: "performance",
    entityId: "perf-001",
    actor: "Ananya Rao",
    at: "2026-06-15 12:06"
  }
];

export const personnel = ["QC Store", "Ananya Rao", "Meera Iyer", "Rohan Shah", "Kavita Menon"];
export const locations = ["Cabinet A-03", "Cabinet B-01", "LC Bay 2", "GC Bay 1", "Quarantine Shelf"];
export const methods = ["Assay method AM-014", "Related substances RS-028", "Residual solvent GC-004", "Cleaning verification CV-019"];
