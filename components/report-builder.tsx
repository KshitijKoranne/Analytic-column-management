"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { defaultReportFieldIds, reportFields, type ReportFieldId, type ReportRow } from "@/lib/reports";

export function ReportBuilder({ rows }: { rows: ReportRow[] }) {
  const [selected, setSelected] = useState<ReportFieldId[]>(defaultReportFieldIds);
  const [filters, setFilters] = useState<Partial<Record<ReportFieldId, string>>>({});

  // Preserve the catalog order regardless of the click order in which fields were ticked.
  const selectedFields = useMemo(() => reportFields.filter((field) => selected.includes(field.id)), [selected]);

  const filteredRows = useMemo(() => {
    const active = selectedFields
      .map((field) => [field.id, (filters[field.id] ?? "").trim().toLowerCase()] as const)
      .filter(([, term]) => term.length > 0);
    if (!active.length) return rows;
    return rows.filter((row) => active.every(([id, term]) => (row[id] ?? "").toLowerCase().includes(term)));
  }, [rows, selectedFields, filters]);

  function toggleField(id: ReportFieldId, checked: boolean) {
    setSelected((current) => (checked ? [...current, id] : current.filter((field) => field !== id)));
  }

  return (
    <div className="report-layout">
      <aside className="report-fields no-print">
        <h2>Fields</h2>
        <p className="field-hint">Tick fields to add them to the report.</p>
        <div className="report-field-list">
          {reportFields.map((field) => (
            <label className="check-row" key={field.id}>
              <input checked={selected.includes(field.id)} onChange={(event) => toggleField(field.id, event.target.checked)} type="checkbox" />
              {field.label}
            </label>
          ))}
        </div>
      </aside>

      <section className="report-output">
        <div className="report-output-head no-print">
          <div>
            <strong>{filteredRows.length}</strong> of {rows.length} columns
          </div>
          <button className="secondary-button" disabled={!selectedFields.length} onClick={() => window.print()} type="button">
            <Printer size={14} />
            Print / Save as PDF
          </button>
        </div>

        {selectedFields.length ? (
          <div className="report-print-area">
            <h1 className="report-print-title">Column register</h1>
            <div className="table-wrap">
              <table className="table report-table">
                <thead>
                  <tr>
                    {selectedFields.map((field) => (
                      <th key={field.id}>{field.label}</th>
                    ))}
                  </tr>
                  <tr className="report-filter-row no-print">
                    {selectedFields.map((field) => (
                      <th key={field.id}>
                        <input
                          aria-label={`Filter ${field.label}`}
                          onChange={(event) => setFilters((current) => ({ ...current, [field.id]: event.target.value }))}
                          placeholder="Filter…"
                          type="search"
                          value={filters[field.id] ?? ""}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={index}>
                      {selectedFields.map((field) => (
                        <td key={field.id}>{row[field.id] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={selectedFields.length}>No columns match the current filters</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-detail">Select at least one field to build the report.</div>
        )}
      </section>
    </div>
  );
}
