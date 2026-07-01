import { AppShell } from "@/components/app-shell";
import { inactivateMasterAction } from "@/app/actions";
import { ActivityScreen } from "@/components/activity-screen";
import { ESignFields } from "@/components/e-sign-fields";
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
  const canCreate = canAccess(access, "masters:create");
  const canInactivate = canAccess(access, "masters:inactivate");
  const showNew = canCreate && params?.new === "1";
  const editId = typeof params?.edit === "string" && canAccess(access, "masters:update") ? params.edit : undefined;
  const editingMaster = editId ? masters.find((master) => master.id === editId && (master.status === "draft" || master.status === "pending_review")) : undefined;
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
        actionLabel={canCreate ? "New column master" : undefined}
        basePath="/masters"
        emptyLabel="No column masters"
        mode={showNew || editingMaster ? "new" : "record"}
        noMatchLabel="No matching column masters"
        notice={notice}
        records={records}
        renderRecordActions={(record) =>
          canInactivate && record.status === "accepted" ? (
            <form action={inactivateMasterAction} className="inline-form">
              <input name="masterId" type="hidden" value={record.id} />
              <ESignFields action={`inactivate-${record.id}`} meaning="Inactivate column master" signerName={signerName} />
              <button className="secondary-button danger-button" type="submit">
                Inactivate
              </button>
            </form>
          ) : null
        }
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
