type SearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> | undefined;

const successMessages: Record<string, string> = {
  destruction_requested: "Destruction request sent for review",
  issuance_created: "Column issued",
  master_submitted: "Column master sent for review",
  master_inactivated: "Column master inactivated",
  master_updated: "Column master updated",
  performance_recorded: "Performance recorded",
  performance_submitted: "Performance sent for review",
  receipt_submitted: "Receipt sent for review",
  review_approved: "Review approved",
  review_returned: "Review returned for correction",
  settings_updated: "Settings updated"
};

const errorMessages: Record<string, string> = {
  database_required: "Database connection required",
  duplicate_part_number: "Part number already exists for this column type and manufacturer",
  master_locked: "Reviewed masters cannot be edited",
  missing_attachment: "Selected attachment type requires a file",
  reason_required: "E-sign remarks are required",
  transaction: "Transaction not completed"
};

export async function transactionNotice(searchParams: SearchParams) {
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;
  if (error) return errorMessages[error] ?? errorMessages.transaction;
  const success = typeof params?.success === "string" ? params.success : undefined;
  return success ? successMessages[success] : undefined;
}
