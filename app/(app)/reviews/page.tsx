import Link from "next/link";
import { Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { ESignFields } from "@/components/e-sign-fields";
import { approveTaskAction, returnTaskAction } from "@/app/actions";
import { canAccess, getAccessContext } from "@/lib/access";
import { getReviewItems } from "@/lib/data";
import { moduleLabels } from "@/lib/labels";
import { transactionNotice } from "@/lib/notices";
import type { Permission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getAccessContext("reviews:read");
  const reviewItems = await getReviewItems();
  const params = await searchParams;
  const notice = await transactionNotice(params);
  const query = typeof params?.q === "string" ? params.q.trim() : "";
  const visibleItems = reviewItems.filter((item) => {
    if (!query) return true;
    return [item.title, moduleLabels[item.module], item.step, item.requestedBy, item.due].join(" ").toLowerCase().includes(query.toLowerCase());
  });
  const signerName = access.name ?? access.email;
  return (
    <AppShell active="reviews" title="Reviews">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="toolbar-left">
            <div className="segment">
              <span>Pending</span>
            </div>
            <form action="/reviews" className="toolbar-search">
              <button aria-label="Search" className="search-submit" type="submit">
                <Search size={14} />
              </button>
              <input aria-label="Search reviews" defaultValue={query} name="q" placeholder="Search record, module, requester" type="search" />
              {query ? (
                <Link aria-label="Clear search" className="search-clear" href="/reviews">
                  <X size={13} />
                </Link>
              ) : null}
            </form>
          </div>
          <Link className="secondary-button" href="/reviews">Refresh</Link>
        </div>
        {notice ? <div className="module-notice">{notice}</div> : null}
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
              {visibleItems.map((item) => (
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
                    {item.taskId && item.permission && canAccess(access, item.permission as Permission) ? (
                      <div className="review-actions">
                        <Link className="secondary-button" href={`/${item.module}?record=${encodeURIComponent(item.recordId)}`}>Open</Link>
                        <form action={returnTaskAction}>
                          <input name="taskId" type="hidden" value={item.taskId} />
                          <ESignFields action={`return-${item.taskId}`} meaning="Return controlled workflow step for correction" requireReason signerName={signerName} />
                          <button className="secondary-button" type="submit">Return</button>
                        </form>
                        <form action={approveTaskAction}>
                          <input name="taskId" type="hidden" value={item.taskId} />
                          <ESignFields action={`approve-${item.taskId}`} meaning="Approve controlled workflow step" signerName={signerName} />
                          <button className="primary-button" type="submit">Approve</button>
                        </form>
                      </div>
                    ) : (
                      <Link className="secondary-button" href={`/${item.module}?record=${encodeURIComponent(item.recordId)}`}>Open</Link>
                    )}
                  </td>
                </tr>
              ))}
              {!visibleItems.length ? (
                <tr>
                  <td colSpan={7}>No reviews</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
