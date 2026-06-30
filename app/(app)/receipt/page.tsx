import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { ReceiptForm } from "@/components/receipt-form";
import { canAccess, requirePermission } from "@/lib/access";
import { getMasters, getModuleRecords } from "@/lib/data";
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
  const showNew = canCreate && params?.new === "1";
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const activeMasters = masters.filter((master) => master.status === "active");
  const today = new Date().toISOString().slice(0, 10);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="receipt" title="Receipt">
      <ActivityScreen
        actionLabel={canCreate ? "New receipt" : undefined}
        basePath="/receipt"
        mode={showNew ? "new" : "record"}
        notice={notice}
        records={records}
        searchPlaceholder="Search part number, make, packing, supplier"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title="New receipt"
        wideNew
      >
        <ReceiptForm masters={activeMasters} signerName={signerName} today={today} />
      </ActivityScreen>
    </AppShell>
  );
}
