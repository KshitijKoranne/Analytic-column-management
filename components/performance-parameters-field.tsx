"use client";

import { useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

type Row = { rowId: string; name: string; low: string; high: string; value: string };

function complianceLabel(row: Row): "Complies" | "Does not comply" | null {
  const value = Number(row.value);
  if (row.value.trim() === "" || !Number.isFinite(value)) return null;
  const low = row.low.trim() === "" ? undefined : Number(row.low);
  const high = row.high.trim() === "" ? undefined : Number(row.high);
  if (low === undefined && high === undefined) return null;
  const lowOk = low === undefined || value >= low;
  const highOk = high === undefined || value <= high;
  return lowOk && highOk ? "Complies" : "Does not comply";
}

export function PerformanceParametersField() {
  // useId() gives a stable per-instance prefix so server/client renders agree on row ids —
  // a module-level counter would drift between the SSR pass and hydration and break the DOM.
  const instanceId = useId();
  const rowCounter = useRef(0);

  function makeRow(): Row {
    rowCounter.current += 1;
    return { rowId: `${instanceId}-${rowCounter.current}`, name: "", low: "", high: "", value: "" };
  }

  const [rows, setRows] = useState<Row[]>(() => [makeRow()]);

  function updateRow(rowId: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [...current, makeRow()]);
  }

  function removeRow(rowId: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.rowId !== rowId) : current));
  }

  return (
    <div className="qualification-grid">
      {rows.map((row) => {
        const compliance = complianceLabel(row);
        const complianceClass = compliance === "Complies" ? "compliance-pass" : compliance === "Does not comply" ? "compliance-fail" : "compliance-pending";
        return (
          <div className="qualification-row" key={row.rowId}>
            <div className="field">
              <label htmlFor={`${row.rowId}-name`}>Parameter</label>
              <input
                id={`${row.rowId}-name`}
                name="parameterKey"
                onChange={(event) => updateRow(row.rowId, { name: event.target.value })}
                placeholder="e.g. Theoretical plates"
                required
                value={row.name}
              />
            </div>
            <div className="field">
              <label htmlFor={`${row.rowId}-low`}>Min</label>
              <input id={`${row.rowId}-low`} inputMode="decimal" name="parameterLow" onChange={(event) => updateRow(row.rowId, { low: event.target.value })} value={row.low} />
            </div>
            <div className="field">
              <label htmlFor={`${row.rowId}-high`}>Max</label>
              <input id={`${row.rowId}-high`} inputMode="decimal" name="parameterHigh" onChange={(event) => updateRow(row.rowId, { high: event.target.value })} value={row.high} />
            </div>
            <div className="field">
              <label htmlFor={`${row.rowId}-value`}>Observed</label>
              <input
                id={`${row.rowId}-value`}
                inputMode="decimal"
                name="parameterValue"
                onChange={(event) => updateRow(row.rowId, { value: event.target.value })}
                required
                value={row.value}
              />
            </div>
            <span className={`compliance-tag ${complianceClass}`}>{compliance ?? "Pending"}</span>
            <button aria-label="Remove parameter" className="icon-button" disabled={rows.length <= 1} onClick={() => removeRow(row.rowId)} type="button">
              <X size={14} />
            </button>
          </div>
        );
      })}
      <button className="secondary-button qualification-add" onClick={addRow} type="button">
        <Plus size={14} />
        Add parameter
      </button>
    </div>
  );
}
