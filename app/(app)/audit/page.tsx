import { AppShell } from "@/components/app-shell";
import { getAuditEvents } from "@/lib/data";
import { humanAction } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auditEvents = await getAuditEvents();
  return (
    <AppShell active="audit" title="Audit">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="segment">
            <span>All</span>
            <span>Receipt</span>
            <span>Issuance</span>
            <span>Performance</span>
            <span>Destruction</span>
          </div>
          <button className="secondary-button">Export</button>
        </div>
        <div className="detail-panel">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Record</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.at}</td>
                  <td>{event.actor}</td>
                  <td>{humanAction(event.action)}</td>
                  <td>{event.entityId}</td>
                  <td>{event.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
