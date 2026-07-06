import Link from "next/link";
import { CheckCircle2, Clock3, Paperclip, Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { ModuleToolbar } from "@/components/module-toolbar";
import { NoticeBanner } from "@/components/notice-banner";
import { StatusBadge } from "@/components/status-badge";
import { matchesRecordQuery } from "@/lib/data";
import { moduleLabels, statusLabels } from "@/lib/labels";
import type { Notice } from "@/lib/notices";
import type { ActivityRecord, ActivityStatus } from "@/lib/types";
import { hrefWith } from "@/lib/url";

const PAGE_SIZE = 20;

type RecordFilter = "all" | "draft" | "pending" | "accepted";

const filterLabels: Record<RecordFilter, string> = {
  all: "All",
  draft: "Draft",
  pending: "Pending",
  accepted: "Accepted"
};

// "destroyed" is intentionally excluded from "accepted" so a live, in-use
// column and a destroyed one don't show up under the same filter tab.
const filterStatuses: Record<RecordFilter, ActivityStatus[]> = {
  all: [],
  draft: ["draft"],
  pending: ["pending_review", "on_hold", "returned"],
  accepted: ["accepted", "issued", "recorded", "approved"]
};

function normalizeFilter(value?: string): RecordFilter {
  return value === "draft" || value === "pending" || value === "accepted" ? value : "all";
}

function matchesFilter(record: ActivityRecord, filter: RecordFilter) {
  const statuses = filterStatuses[filter];
  return statuses.length === 0 || statuses.includes(record.status);
}

export function ActivityScreen({
  basePath,
  title,
  actionLabel,
  emptyLabel = "No records",
  noMatchLabel = "No matching records",
  records,
  children,
  notice,
  mode,
  selectedId,
  wideNew = false,
  statusFilter,
  searchQuery,
  searchPlaceholder = "Search records",
  hideSearch = false,
  page,
  renderRecordActions
}: {
  basePath: string;
  title: string;
  actionLabel?: string;
  emptyLabel?: string;
  noMatchLabel?: string;
  records: ActivityRecord[];
  children: React.ReactNode;
  notice?: Notice;
  mode?: "record" | "new";
  selectedId?: string;
  wideNew?: boolean;
  statusFilter?: string;
  searchQuery?: string;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  page?: string;
  renderRecordActions?: (record: ActivityRecord) => ReactNode;
}) {
  const activeMode = mode ?? (records.length ? "record" : "new");
  const activeFilter = normalizeFilter(statusFilter);
  const query = searchQuery?.trim() ?? "";
  const visibleRecords = records.filter((record) => matchesFilter(record, activeFilter) && matchesRecordQuery(record, query));
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.parseInt(page ?? "1", 10) || 1, 1), totalPages);
  const pageParams = { status: activeFilter === "all" ? undefined : activeFilter, q: query || undefined };
  const pagedRecords = visibleRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = visibleRecords.find((record) => record.id === selectedId) ?? pagedRecords[0];

  return (
    <section className="module-shell">
      <ModuleToolbar
        action={
          actionLabel ? (
            <Link className="secondary-button" href={`${basePath}?new=1`}>
              <Plus size={14} />
              {actionLabel}
            </Link>
          ) : undefined
        }
        search={
          hideSearch
            ? undefined
            : {
                basePath,
                query,
                placeholder: searchPlaceholder,
                hiddenFields: { status: activeFilter === "all" ? undefined : activeFilter }
              }
        }
        segments={(Object.keys(filterLabels) as RecordFilter[]).map((filter) => ({
          key: filter,
          label: filterLabels[filter],
          active: activeFilter === filter,
          href: hrefWith(basePath, { status: filter === "all" ? undefined : filter, q: query || undefined })
        }))}
      />
      <NoticeBanner notice={notice} />
      <div className={`module-grid ${wideNew && activeMode === "new" ? "module-grid-wide-new" : ""}`}>
        <div className="record-list">
          {pagedRecords.length ? (
            pagedRecords.map((record) => (
              <Link
                className={`record-row ${activeMode === "record" && selected?.id === record.id ? "selected" : ""}`}
                href={hrefWith(basePath, {
                  ...pageParams,
                  record: record.id,
                  page: currentPage > 1 ? String(currentPage) : undefined
                })}
                key={record.id}
              >
                <div>
                  <p className="record-title">{record.title}</p>
                  <div className="record-subtitle">{record.subtitle}</div>
                  <div className="record-meta">
                    <span>{record.owner}</span>
                    <span>{record.date}</span>
                    {record.attachments.length > 0 ? (
                      <span className="meta-icon">
                        <Paperclip size={12} /> {record.attachments.length}
                      </span>
                    ) : null}
                  </div>
                </div>
                <StatusBadge label={record.statusLabel} status={record.status} />
              </Link>
            ))
          ) : (
            <div className="empty-row">{emptyLabel}</div>
          )}
          {totalPages > 1 ? (
            <div className="record-pagination">
              {currentPage <= 1 ? (
                <span className="ghost-button disabled-link" aria-disabled="true">Previous</span>
              ) : (
                <Link className="ghost-button" href={hrefWith(basePath, { ...pageParams, page: currentPage > 2 ? String(currentPage - 1) : undefined })}>
                  Previous
                </Link>
              )}
              <span>
                Page {currentPage} of {totalPages}
              </span>
              {currentPage >= totalPages ? (
                <span className="ghost-button disabled-link" aria-disabled="true">Next</span>
              ) : (
                <Link className="ghost-button" href={hrefWith(basePath, { ...pageParams, page: String(currentPage + 1) })}>
                  Next
                </Link>
              )}
            </div>
          ) : null}
        </div>
        <div className="detail-panel">
          {activeMode === "new" ? (
            <>
              <div className="panel-head">
                <h2>{title}</h2>
              </div>
              {children}
            </>
          ) : !selected ? (
            <div className="empty-detail">{noMatchLabel}</div>
          ) : (
            <RecordDetail record={selected} renderRecordActions={renderRecordActions} />
          )}
        </div>
      </div>
    </section>
  );
}

function RecordDetail({
  record,
  renderRecordActions
}: {
  record: ActivityRecord;
  renderRecordActions?: (record: ActivityRecord) => ReactNode;
}) {
  return (
    <>
      <div className="panel-head">
        <div>
          <h2>{record.title}</h2>
          {record.module === "masters" ? null : <div className="record-subtitle">{record.subtitle}</div>}
        </div>
        <div className="panel-actions">
          {record.detailActionHref ? (
            <Link className="secondary-button" href={record.detailActionHref}>
              <Pencil size={13} />
              {record.detailActionLabel ?? "Edit"}
            </Link>
          ) : null}
          {renderRecordActions?.(record)}
          <StatusBadge label={record.statusLabel} status={record.status} />
        </div>
      </div>
      <div className="detail-summary">
        {(record.detailRows ?? [
          { label: "Owner", value: record.owner },
          { label: "Date", value: record.date || "-" },
          { label: "Column ID", value: record.columnId ?? "-" },
          { label: "Master", value: record.masterName ?? "-" }
        ]).map((row) => (
          <div className="summary-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value || "-"}</strong>
          </div>
        ))}
      </div>
      {record.module === "masters" || record.module === "issuance" ? null : (
        <>
          <div className="section-label">Attachments</div>
          {record.attachments.length ? (
            <div className="form-grid">
              {record.attachments.map((attachment) => (
                <div className="file-row" key={attachment.id}>
                  <Paperclip size={15} />
                  <span>{attachment.fileName}</span>
                  <span>{attachment.sizeLabel}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="file-row">None</div>
          )}
          <div className="section-label">History</div>
          <div className="timeline-stack">
            <div className="timeline-row">
              <Clock3 size={14} />
              <span>{record.date || "Open"}</span>
              <span>{record.owner}</span>
            </div>
            <div className="timeline-row">
              <CheckCircle2 size={14} />
              <span>{record.statusLabel ?? statusLabels[record.status]}</span>
              <span>{moduleLabels[record.module]}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
