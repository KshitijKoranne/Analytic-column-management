"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Paperclip, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { moduleLabels, statusLabels } from "@/lib/labels";
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
  const [mode, setMode] = useState<"record" | "new">(records.length ? "record" : "new");
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const selected = useMemo(() => records.find((record) => record.id === selectedId) ?? records[0], [records, selectedId]);

  return (
    <section className="module-shell">
      <div className="module-toolbar">
        <div className="segment">
          <span>All</span>
          <span>Draft</span>
          <span>Pending</span>
          <span>Accepted</span>
        </div>
        <button className="secondary-button" onClick={() => setMode("new")} type="button">
          <Plus size={14} />
          {actionLabel}
        </button>
      </div>
      <div className="module-grid">
        <div className="record-list">
          {records.length ? (
            records.map((record) => (
              <button
                className={`record-row ${mode === "record" && selected?.id === record.id ? "selected" : ""}`}
                key={record.id}
                onClick={() => {
                  setSelectedId(record.id);
                  setMode("record");
                }}
                type="button"
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
                <StatusBadge status={record.status} />
              </button>
            ))
          ) : (
            <div className="empty-row">No records</div>
          )}
        </div>
        <div className="detail-panel">
          {mode === "new" || !selected ? (
            <>
              <div className="panel-head">
                <h2>{title}</h2>
              </div>
              {children}
            </>
          ) : (
            <RecordDetail record={selected} />
          )}
        </div>
      </div>
    </section>
  );
}

function RecordDetail({ record }: { record: ActivityRecord }) {
  return (
    <>
      <div className="panel-head">
        <div>
          <h2>{record.title}</h2>
          <div className="record-subtitle">{record.subtitle}</div>
        </div>
        <StatusBadge status={record.status} />
      </div>
      <div className="detail-summary">
        <div className="summary-row">
          <span>Owner</span>
          <strong>{record.owner}</strong>
        </div>
        <div className="summary-row">
          <span>Date</span>
          <strong>{record.date || "-"}</strong>
        </div>
        <div className="summary-row">
          <span>Column ID</span>
          <strong>{record.columnId ?? "-"}</strong>
        </div>
        <div className="summary-row">
          <span>Master</span>
          <strong>{record.masterName ?? "-"}</strong>
        </div>
      </div>
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
          <span>{statusLabels[record.status]}</span>
          <span>{moduleLabels[record.module]}</span>
        </div>
      </div>
    </>
  );
}
