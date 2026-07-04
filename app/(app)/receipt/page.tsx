import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { ReceiptForm } from "@/components/receipt-form";
import { canAccess, requirePermission } from "@/lib/access";
import { getAvailableColumnIds, getMasters, getModuleRecords, getReceiptFormRecord } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("receipt:read");
  const params = await searchParams;
  const [records, masters] = await Promise.all([getModuleRecords("receipt"), getMasters()]);
  const notice = await transactionNotice(params);
  const canCreate = canAccess(access, "receipt:create");
  const canEdit = canAccess(access, "receipt:update");
  const visibleRecords = canEdit ? records : records.map(({ detailActionHref, detailActionLabel, ...record }) => record);
  const showNew = canCreate && params?.new === "1";
  const editId = typeof params?.edit === "string" && canEdit ? params.edit : undefined;
  const editingReceipt = editId ? await getReceiptFormRecord(editId) : undefined;
  const availableColumnIds = canCreate && !editingReceipt ? await getAvailableColumnIds() : [];
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const page = typeof params?.page === "string" ? params.page : undefined;
  const activeMasters = masters.filter((master) => master.status === "active");
  const receiptMasters = editingReceipt
    ? masters.filter((master) => master.status === "active" || master.id === editingReceipt.columnMasterId)
    : activeMasters;
  const today = new Date().toISOString().slice(0, 10);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="receipt" title="Receipt">
      <ActivityScreen
        actionLabel={canCreate ? "New receipt" : undefined}
        basePath="/receipt"
        mode={showNew || editingReceipt ? "new" : "record"}
        notice={notice}
        page={page}
        records={visibleRecords}
        hideSearch={showNew || Boolean(editingReceipt)}
        searchPlaceholder="Search part number, make, packing, supplier"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title={editingReceipt ? "Edit receipt" : "New receipt"}
        wideNew
      >
        <ReceiptForm availableColumnIds={availableColumnIds} initialValue={editingReceipt} masters={receiptMasters} mode={editingReceipt ? "edit" : "create"} signerName={signerName} today={today} />
      </ActivityScreen>
    </AppShell>
  );
}
