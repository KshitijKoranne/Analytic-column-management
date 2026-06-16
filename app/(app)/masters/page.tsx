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
  await requirePermission("masters:read");
  const records = await getModuleRecords("masters");
  const notice = await transactionNotice(searchParams);

  return (
    <AppShell active="masters" title="Masters">
      <ActivityScreen actionLabel="New master" notice={notice} records={records} title="New master" wideNew>
        <MasterForm />
      </ActivityScreen>
    </AppShell>
  );
}
