import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { MasterForm } from "@/components/master-form";
import { getModuleRecords } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MastersPage() {
  const records = await getModuleRecords("masters");

  return (
    <AppShell active="masters" title="Masters">
      <ActivityScreen actionLabel="New master" records={records} title="New master" wideNew>
        <MasterForm />
      </ActivityScreen>
    </AppShell>
  );
}
