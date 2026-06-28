import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { MasterForm } from "@/components/master-form";
import { canAccess, requirePermission } from "@/lib/access";
import { getMasters, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";

export const dynamic = "force-dynamic";

export default async function MastersPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("masters:read");
  const params = await searchParams;
  const [rawRecords, masters] = await Promise.all([getModuleRecords("masters"), getMasters()]);
  const notice = await transactionNotice(params);
  const showNew = params?.new === "1";
  const editId = typeof params?.edit === "string" && canAccess(access, "masters:update") ? params.edit : undefined;
  const editingMaster = editId ? masters.find((master) => master.id === editId) : undefined;
  const records = canAccess(access, "masters:update")
    ? rawRecords
    : rawRecords.map(({ detailActionHref, detailActionLabel, ...record }) => record);
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="masters" title="Masters">
      <ActivityScreen
        actionLabel="New master"
        basePath="/masters"
        mode={showNew || editingMaster ? "new" : "record"}
        notice={notice}
        records={records}
        searchPlaceholder="Search name, type, make, part number"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title={editingMaster ? "Edit master" : "New master"}
        wideNew
      >
        <MasterForm initialValue={editingMaster} mode={editingMaster ? "edit" : "create"} signerName={signerName} />
      </ActivityScreen>
    </AppShell>
  );
}
