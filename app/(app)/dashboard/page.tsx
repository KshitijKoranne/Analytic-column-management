import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/access";
import { getDashboardStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await getAccessContext();
  const stats = await getDashboardStats();

  return (
    <AppShell active="dashboard" title="Dashboard">
      <section className="dashboard-shell">
        <AttentionPanel items={stats.needsAttention} />

        <div className="metric-grid">
          <Metric label="Columns" value={stats.totalColumns} />
          <Metric label="Accepted" value={stats.acceptedColumns} />
          <Metric label="Not accepted" value={stats.notAcceptedColumns} />
          <Metric label="Active masters" value={stats.activeMasters} />
          <Metric label="Pending masters" value={stats.pendingMasters} />
        </div>

        <div className="dashboard-grid">
          <DashboardList rows={stats.byType} title="Column type" />
          <DashboardList rows={stats.byStatus} title="Column status" />
        </div>
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

function DashboardList({ rows, title }: { rows: Array<{ label: string; value: number }>; title: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="dashboard-panel">
      <h2>{title}</h2>
      <div className="dashboard-list">
        {rows.length ? (
          rows.map((row) => (
            <div className="dashboard-row" key={row.label}>
              <div>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
              <div className="dashboard-bar">
                <span style={{ width: `${(row.value / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <div className="empty-row">No records</div>
        )}
      </div>
    </div>
  );
}
