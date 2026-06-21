import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { MasterForm } from "@/components/master-form";
import { requirePermission } from "@/lib/access";
import { getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";

export const dynamic = "force-dynamic";

export default async function MastersPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("masters:read");
  const params = await searchParams;
  const records = await getModuleRecords("masters");
  const notice = await transactionNotice(params);
  const showNew = params?.new === "1";
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="masters" title="Masters">
      <ActivityScreen
        actionLabel="New master"
        basePath="/masters"
        mode={showNew ? "new" : "record"}
        notice={notice}
        records={records}
        searchPlaceholder="Search name, type, make, part number"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title="New master"
        wideNew
      >
        <MasterForm signerName={signerName} />
      </ActivityScreen>
    </AppShell>
  );
}
