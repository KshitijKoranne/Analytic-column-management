"use client";

import { useState } from "react";
import { RequiredLabel } from "@/components/required-label";
import type { ColumnUnit } from "@/lib/types";

export function ColumnSelectField({
  columns,
  emptyLabel = "No eligible columns"
}: {
  columns: ColumnUnit[];
  emptyLabel?: string;
}) {
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const selected = columns.find((column) => column.id === columnId);

  return (
    <div className="field">
      <RequiredLabel htmlFor="columnId">Column ID</RequiredLabel>
      <select id="columnId" name="columnId" onChange={(event) => setColumnId(event.target.value)} required value={columnId}>
        {!columns.length && <option value="">{emptyLabel}</option>}
        {columns.map((column) => (
          <option key={column.id} value={column.id}>
            {column.assetCode} · {column.storageLocation}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="column-info-panel">
          {selected.master ? (
            <div className="column-info-row">
              <span>Master</span>
              <strong>{[selected.master.partNumber, selected.master.manufacturer, selected.master.packing, selected.master.dimensions].filter(Boolean).join(" · ")}</strong>
            </div>
          ) : null}
          <div className="column-info-row">
            <span>Location</span>
            <strong>{selected.storageLocation}</strong>
          </div>
          <div className="column-info-row">
            <span>Current holder</span>
            <strong>{selected.currentHolder}</strong>
          </div>
          {selected.dedicatedProduct || selected.dedicatedTest ? (
            <div className="column-info-row">
              <span>Dedicated to</span>
              <strong>{[selected.dedicatedProduct, selected.dedicatedTest].filter(Boolean).join(" · ")}</strong>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
