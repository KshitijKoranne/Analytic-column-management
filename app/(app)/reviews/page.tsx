import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { approveTaskAction } from "@/app/actions";
import { getReviewItems } from "@/lib/data";
import { moduleLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const reviewItems = await getReviewItems();
  return (
    <AppShell active="reviews" title="Reviews">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="segment">
            <span>Pending</span>
            <span>Returned</span>
            <span>Approved</span>
          </div>
          <button className="secondary-button">Refresh</button>
        </div>
        <div className="detail-panel">
          <table className="table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Module</th>
                <th>Step</th>
                <th>Requested by</th>
                <th>Due</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reviewItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{moduleLabels[item.module]}</td>
                  <td>{item.step}</td>
                  <td>{item.requestedBy}</td>
                  <td>{item.due}</td>
                  <td>
                    <StatusBadge status="pending_review" />
                  </td>
                  <td>
                    {item.taskId && item.permission ? (
                      <form action={approveTaskAction}>
                        <input name="taskId" type="hidden" value={item.taskId} />
                        <input name="permission" type="hidden" value={item.permission} />
                        <button className="secondary-button" type="submit">Approve</button>
                      </form>
                    ) : (
                      <button className="secondary-button">Open</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
