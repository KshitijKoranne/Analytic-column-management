import { AppShell } from "@/components/app-shell";
import { ModuleToolbar } from "@/components/module-toolbar";
import { requirePermission } from "@/lib/access";
import { getAuditEvents } from "@/lib/data";
import { humanAction } from "@/lib/labels";
import { hrefWith } from "@/lib/url";

export const dynamic = "force-dynamic";

type AuditFilter = "all" | "receipt" | "issuance" | "performance" | "destruction";

const auditFilterLabels: Record<AuditFilter, string> = {
  all: "All",
  receipt: "Receipt",
  issuance: "Issuance",
  performance: "Performance",
  destruction: "Destruction"
};

function normalizeAuditFilter(value?: string): AuditFilter {
  return value === "receipt" || value === "issuance" || value === "performance" || value === "destruction" ? value : "all";
}

export default async function AuditPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("audit:read");
  const auditEvents = await getAuditEvents();
  const params = await searchParams;
  const activeFilter = normalizeAuditFilter(typeof params?.type === "string" ? params.type : undefined);
  const query = typeof params?.q === "string" ? params.q.trim().toLowerCase() : "";
  const visibleEvents = auditEvents.filter((event) => {
    if (activeFilter !== "all" && event.entityType !== activeFilter) return false;
    if (!query) return true;
    return [event.at, event.actor, humanAction(event.action), event.entityId, event.previousValue, event.nextValue, event.reason]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <AppShell active="audit" title="Audit">
      <section className="module-shell">
        <ModuleToolbar
          action={<button className="secondary-button">Export</button>}
          search={{
            basePath: "/audit",
            query,
            placeholder: "Search user, action, record, reason",
            hiddenFields: { type: activeFilter === "all" ? undefined : activeFilter }
          }}
          segments={(Object.keys(auditFilterLabels) as AuditFilter[]).map((filter) => ({
            key: filter,
            label: auditFilterLabels[filter],
            active: activeFilter === filter,
            href: hrefWith("/audit", { type: filter === "all" ? undefined : filter, q: query || undefined })
          }))}
        />
        <div className="detail-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Record</th>
                  <th>Previous value</th>
                  <th>Next value</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {visibleEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{event.at}</td>
                    <td>{event.actor}</td>
                    <td>{humanAction(event.action)}</td>
                    <td>{event.entityId}</td>
                    <td>{event.previousValue}</td>
                    <td>{event.nextValue}</td>
                    <td>{event.reason ?? ""}</td>
                  </tr>
                ))}
                {!visibleEvents.length ? (
                  <tr>
                    <td colSpan={7}>No matching audit events</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
