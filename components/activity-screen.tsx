import Link from "next/link";
import { CheckCircle2, Clock3, Paperclip, Pencil, Plus, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { NoticeBanner } from "@/components/notice-banner";
import { StatusBadge } from "@/components/status-badge";
import { moduleLabels, statusLabels } from "@/lib/labels";
import type { Notice } from "@/lib/notices";
import type { ActivityRecord, ActivityStatus } from "@/lib/types";

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

function matchesQuery(record: ActivityRecord, query: string) {
  if (!query) return true;
  const haystack = [
    record.title,
    record.subtitle,
    record.owner,
    record.date,
    record.columnId,
    record.masterName,
    ...(record.detailRows?.flatMap((row) => [row.label, row.value]) ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function hrefWith(basePath: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
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
  renderRecordActions?: (record: ActivityRecord) => ReactNode;
}) {
  const activeMode = mode ?? (records.length ? "record" : "new");
  const activeFilter = normalizeFilter(statusFilter);
  const query = searchQuery?.trim() ?? "";
  const visibleRecords = records.filter((record) => matchesFilter(record, activeFilter) && matchesQuery(record, query));
  const selected = visibleRecords.find((record) => record.id === selectedId) ?? visibleRecords[0];

  return (
    <section className="module-shell">
      <div className="module-toolbar">
        <div className="toolbar-left">
          <div className="segment">
            {(Object.keys(filterLabels) as RecordFilter[]).map((filter) => (
              <Link
                className={activeFilter === filter ? "active" : ""}
                href={hrefWith(basePath, { status: filter === "all" ? undefined : filter, q: query || undefined })}
                key={filter}
              >
                {filterLabels[filter]}
              </Link>
            ))}
          </div>
          {hideSearch ? null : (
            <form action={basePath} className="toolbar-search">
              {activeFilter !== "all" ? <input name="status" type="hidden" value={activeFilter} /> : null}
              <button aria-label="Search" className="search-submit" type="submit">
                <Search size={14} />
              </button>
              <input aria-label="Search records" defaultValue={query} name="q" placeholder={searchPlaceholder} type="search" />
              {query ? (
                <Link aria-label="Clear search" className="search-clear" href={hrefWith(basePath, { status: activeFilter === "all" ? undefined : activeFilter })}>
                  <X size={13} />
                </Link>
              ) : null}
            </form>
          )}
        </div>
        {actionLabel ? (
          <Link className="secondary-button" href={`${basePath}?new=1`}>
            <Plus size={14} />
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <NoticeBanner notice={notice} />
      <div className={`module-grid ${wideNew && activeMode === "new" ? "module-grid-wide-new" : ""}`}>
        <div className="record-list">
          {visibleRecords.length ? (
            visibleRecords.map((record) => (
              <Link
                className={`record-row ${activeMode === "record" && selected?.id === record.id ? "selected" : ""}`}
                href={hrefWith(basePath, {
                  record: record.id,
                  status: activeFilter === "all" ? undefined : activeFilter,
                  q: query || undefined
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
          ) : records.length === 0 && actionLabel ? (
            <div className="empty-row empty-row-cta">
              <span>{emptyLabel}</span>
              <Link className="secondary-button" href={`${basePath}?new=1`}>
                <Plus size={14} />
                {actionLabel}
              </Link>
            </div>
          ) : (
            <div className="empty-row">{emptyLabel}</div>
          )}
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
      {record.module === "masters" ? null : (
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
