import { Paperclip } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { ActivityRecord } from "@/lib/types";

export function ActivityScreen({
  title,
  actionLabel,
  records,
  children
}: {
  title: string;
  actionLabel: string;
  records: ActivityRecord[];
  children: React.ReactNode;
}) {
  return (
    <section className="module-shell">
      <div className="module-toolbar">
        <div className="segment">
          <span>All</span>
          <span>Draft</span>
          <span>Pending</span>
          <span>Accepted</span>
        </div>
        <button className="secondary-button">{actionLabel}</button>
      </div>
      <div className="module-grid">
        <div className="record-list">
          {records.map((record, index) => (
            <div className={`record-row ${index === 0 ? "selected" : ""}`} key={record.id}>
              <div>
                <p className="record-title">{record.title}</p>
                <div className="record-subtitle">{record.subtitle}</div>
                <div className="record-meta">
                  <span>{record.owner}</span>
                  <span>{record.date}</span>
                  {record.attachments.length > 0 ? (
                    <span>
                      <Paperclip size={12} /> {record.attachments.length}
                    </span>
                  ) : null}
                </div>
              </div>
              <StatusBadge status={record.status} />
            </div>
          ))}
        </div>
        <div className="detail-panel">
          <div className="panel-head">
            <h2>{title}</h2>
          </div>
          {children}
          <div className="section-label">History</div>
          <div className="timeline-row">
            <FileDot />
            <span>Saved draft</span>
            <span>Pending review</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FileDot() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 14 14" width="14">
      <circle cx="7" cy="7" fill="#0a84ff" r="4" />
    </svg>
  );
}
