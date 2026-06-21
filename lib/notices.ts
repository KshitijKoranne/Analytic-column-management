type SearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> | undefined;

const successMessages: Record<string, string> = {
  destruction_requested: "Destruction request sent for review",
  issuance_created: "Column issued",
  master_submitted: "Column master sent for review",
  performance_recorded: "Performance recorded",
  performance_submitted: "Performance sent for review",
  receipt_submitted: "Receipt sent for review",
  review_approved: "Review approved",
  settings_updated: "Settings updated"
};

export async function transactionNotice(searchParams: SearchParams) {
  const params = await searchParams;
  if (params?.error === "transaction") return "Transaction not completed";
  const success = typeof params?.success === "string" ? params.success : undefined;
  return success ? successMessages[success] : undefined;
}
