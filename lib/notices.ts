type SearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> | undefined;

export type Notice = { type: "success" | "error"; message: string };

const successMessages: Record<string, string> = {
  destruction_requested: "Destruction request sent for review",
  issuance_created: "Column issued",
  master_submitted: "Column master sent for review",
  master_inactivated: "Column master inactivated",
  master_updated: "Column master updated",
  performance_recorded: "Performance recorded",
  performance_submitted: "Performance sent for review",
  receipt_submitted: "Receipt sent for review",
  receipt_updated: "Receipt sent for review",
  password_changed: "Password changed",
  review_approved: "Review approved",
  review_returned: "Review returned for correction",
  settings_updated: "Settings updated"
};

const errorMessages: Record<string, string> = {
  database_required: "Database connection required",
  duplicate_part_number: "Part number already exists for this column type and manufacturer",
  captcha_failed: "Captcha answer is not correct",
  invalid_current_password: "Current password is not correct",
  master_locked: "Reviewed masters cannot be edited",
  missing_attachment: "Selected attachment type requires a file",
  password_mismatch: "New password and confirmation do not match",
  reason_required: "E-sign remarks are required",
  reset_failed: "Recovery answer is not correct",
  self_review_blocked: "Creators cannot approve or return their own workflow",
  sod_ack_required: "Creation and approval rights require acknowledgement",
  transaction: "Transaction not completed"
};

export async function transactionNotice(searchParams: SearchParams): Promise<Notice | undefined> {
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;
  if (error) {
    return { type: "error", message: errorMessages[error] ?? errorMessages.transaction };
  }
  const success = typeof params?.success === "string" ? params.success : undefined;
  const message = success ? successMessages[success] : undefined;
  return message ? { type: "success", message } : undefined;
}
