import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardCharts } from "@/components/dashboard-charts";
import { canAccess, getAccessContext } from "@/lib/access";
import { getDashboardStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const access = await getAccessContext();
  const stats = await getDashboardStats();
  // Only surface action items for modules this user is actually allowed to open, so the
  // "needs attention" panel never points someone at work they have no rights to act on.
  const attentionItems = stats.needsAttention.filter((item) => canAccess(access, item.permission));

  return (
    <AppShell active="dashboard" title="Dashboard">
      <section className="dashboard-shell">
        <AttentionPanel items={attentionItems} />

        <div className="metric-grid">
          <Metric label="Columns" value={stats.totalColumns} />
          <Metric label="Accepted" value={stats.acceptedColumns} />
          <Metric label="Not accepted" value={stats.notAcceptedColumns} />
          <Metric label="Active masters" value={stats.activeMasters} />
          <Metric label="Pending masters" value={stats.pendingMasters} />
        </div>

        <DashboardCharts byStatus={stats.byStatus} byType={stats.byType} />
      </section>
    </AppShell>
  );
}

function AttentionPanel({ items }: { items: Array<{ label: string; value: number; href: string }> }) {
  return (
    <div className="attention-panel">
      <h2>Needs attention</h2>
      {items.length ? (
        <div className="attention-list">
          {items.map((item) => (
            <Link className="attention-row" href={item.href} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <ChevronRight size={14} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="attention-empty">
          <CheckCircle2 size={16} />
          <span>All caught up — nothing on hold or pending review.</span>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

