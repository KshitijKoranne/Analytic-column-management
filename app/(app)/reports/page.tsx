import { AppShell } from "@/components/app-shell";
import { ReportBuilder } from "@/components/report-builder";
import { requirePermission } from "@/lib/access";
import { getColumnRegister } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission("reports:read");
  const rows = await getColumnRegister();

  return (
    <AppShell active="reports" title="Reports">
      <section className="module-shell report-shell">
        <ReportBuilder rows={rows} />
      </section>
    </AppShell>
  );
}
