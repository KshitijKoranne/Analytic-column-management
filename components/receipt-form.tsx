"use client";

import { useMemo, useRef, useState } from "react";
import { createReceiptAction, updateReceiptAction } from "@/app/actions";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";
import { SubmitButton } from "@/components/submit-button";
import type { ColumnMaster, ReceiptFormRecord } from "@/lib/types";

export function ReceiptForm({
  initialValue,
  masters,
  mode = "create",
  signerName,
  today
}: {
  initialValue?: ReceiptFormRecord;
  masters: ColumnMaster[];
  mode?: "create" | "edit";
  signerName?: string | null;
  today: string;
}) {
  const action = mode === "edit" ? updateReceiptAction : createReceiptAction;
  const initialMasterId = initialValue?.columnMasterId ?? "";
  const [masterId, setMasterId] = useState(initialMasterId);
  const [query, setQuery] = useState(() => {
    const master = masters.find((item) => item.id === initialMasterId);
    return master ? masterSearchLabel(master) : "";
  });
  const [open, setOpen] = useState(false);
  const [attachmentTypes, setAttachmentTypes] = useState<string[]>([]);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selected = useMemo(() => masters.find((master) => master.id === masterId), [masterId, masters]);
  const filteredMasters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return masters;
    return masters.filter((master) => masterSearchLabel(master).toLowerCase().includes(needle));
  }, [masters, query]);
  const hasMasters = masters.length > 0;
  const canSubmit = hasMasters && Boolean(selected);
  const isAttachmentRequired = (type: string) => attachmentTypes.includes(type);

  function toggleAttachmentType(type: string, checked: boolean) {
    setAttachmentTypes((current) => (checked ? [...new Set([...current, type])] : current.filter((item) => item !== type)));
  }

  function selectMaster(master: ColumnMaster) {
    setMasterId(master.id);
    setQuery(masterSearchLabel(master));
    setOpen(false);
  }

  function handleQueryChange(input: string) {
    setQuery(input);
    setOpen(true);
    setMasterId("");
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => setOpen(false), 120);
  }

  function cancelBlur() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
  }

  return (
    <form action={action} className="form-grid">
      {initialValue ? <input name="receiptId" type="hidden" value={initialValue.id} /> : null}
      <input name="columnMasterId" type="hidden" value={masterId} />
      {mode === "create" ? (
        <div className="field combobox">
          <RequiredLabel htmlFor="masterSearch">Search master</RequiredLabel>
          <input
            aria-controls="masterSearchListbox"
            aria-expanded={open}
            autoComplete="off"
            disabled={!hasMasters}
            id="masterSearch"
            onBlur={handleBlur}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Part no., column type, manufacturer, packing"
            role="combobox"
            type="text"
            value={query}
          />
          {open && hasMasters ? (
            <ul className="combobox-list" id="masterSearchListbox" onMouseDown={cancelBlur} role="listbox">
              {filteredMasters.length ? (
                filteredMasters.map((master) => (
                  <li key={master.id}>
                    <button
                      aria-selected={master.id === masterId}
                      className={`combobox-option ${master.id === masterId ? "active" : ""}`}
                      onClick={() => selectMaster(master)}
                      role="option"
                      type="button"
                    >
                      {masterSearchLabel(master)}
                    </button>
                  </li>
                ))
              ) : (
                <li className="combobox-empty">No matching active masters</li>
              )}
            </ul>
          ) : null}
          {!selected ? <small className="field-hint">Select a master from the list to continue.</small> : null}
        </div>
      ) : null}

      <div className="two-col">
        <MasterField label="Part number" name="masterPartNumber" value={selected?.partNumber ?? ""} />
        <MasterField label="Column type" name="masterColumnType" value={selected?.columnType ?? ""} />
      </div>
      <div className="two-col">
        <MasterField label="Manufacturer" name="masterManufacturer" value={selected?.manufacturer ?? ""} />
        <MasterField label="Packing" name="masterPacking" value={selected?.packing ?? ""} />
      </div>
      <MasterField label="Dimensions" name="masterDimensions" value={selected?.dimensions ?? ""} />

      {mode === "create" ? (
        <div className="field">
          <label htmlFor="assetCodePreview">Column ID</label>
          <input
            className="asset-code-preview"
            id="assetCodePreview"
            readOnly
            value={selected ? `COL/${assetCodePrefix(selected.columnType)}/…` : "Select a master first"}
          />
          <small className="field-hint">Assigned automatically on submit, continuing the sequence for this column type.</small>
        </div>
      ) : null}

      <div className="two-col">
        <div className="field">
          <RequiredLabel htmlFor="serialNumber">Serial number</RequiredLabel>
          <input defaultValue={initialValue?.serialNumber} disabled={!canSubmit} id="serialNumber" name="serialNumber" required />
        </div>
        <div className="field">
          <label htmlFor="supplier">Supplier</label>
          <input defaultValue={initialValue?.supplier} disabled={!canSubmit} id="supplier" name="supplier" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="poNumber">PO number</label>
        <input defaultValue={initialValue?.poNumber} disabled={!canSubmit} id="poNumber" name="poNumber" />
      </div>
      <div className="field">
        <RequiredLabel htmlFor="receivedDate">Received date</RequiredLabel>
        <input defaultValue={initialValue?.receivedDate ?? today} disabled={!canSubmit} id="receivedDate" name="receivedDate" required type="date" />
      </div>
      <input name="storageLocation" type="hidden" value="QC Store" />
      <div className="field">
        <RequiredLabel htmlFor="condition">Condition</RequiredLabel>
        <select defaultValue={initialValue?.condition ?? "Intact"} disabled={!canSubmit} id="condition" name="condition" required>
          <option>Intact</option>
          <option>Damaged</option>
        </select>
      </div>
      <div className="section-label">Attachments</div>
      <div className="attachment-grid">
        <AttachmentField
          checked={isAttachmentRequired("coa")}
          disabled={!canSubmit}
          label="CoA"
          name="attachments_coa"
          onToggle={(checked) => toggleAttachmentType("coa", checked)}
          type="coa"
        />
        <AttachmentField
          checked={isAttachmentRequired("po")}
          disabled={!canSubmit}
          label="PO"
          name="attachments_po"
          onToggle={(checked) => toggleAttachmentType("po", checked)}
          type="po"
        />
        <AttachmentField
          checked={isAttachmentRequired("other")}
          disabled={!canSubmit}
          label="Other"
          name="attachments_other"
          onToggle={(checked) => toggleAttachmentType("other", checked)}
          type="other"
        />
      </div>
      <div className="field">
        <label htmlFor="remarks">Remarks</label>
        <textarea defaultValue={initialValue?.remarks} disabled={!canSubmit} id="remarks" name="remarks" />
      </div>
      <ESignFields action={mode === "edit" ? "receipt-resubmit" : "receipt-submit"} meaning={mode === "edit" ? "Resubmit returned receipt" : "Submit column receipt"} signerName={signerName} />
      <div className="actions">
        <SubmitButton disabled={!canSubmit} pendingLabel={mode === "edit" ? "Resubmitting…" : "Submitting…"}>
          {mode === "edit" ? "Resubmit" : "Submit"}
        </SubmitButton>
      </div>
    </form>
  );
}

function assetCodePrefix(columnType: string) {
  return columnType.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "") || "GEN";
}

function masterSearchLabel(master: ColumnMaster) {
  return [master.partNumber, master.columnType, master.manufacturer, master.packing].filter(Boolean).join(" · ");
}

function MasterField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="field">
      <RequiredLabel htmlFor={name}>{label}</RequiredLabel>
      <input defaultValue={value} id={name} key={`${name}-${value}`} name={name} readOnly={Boolean(value)} required />
    </div>
  );
}

function AttachmentField({
  checked,
  disabled,
  label,
  name,
  onToggle,
  type
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  name: string;
  onToggle: (checked: boolean) => void;
  type: string;
}) {
  const fileId = `${name}-file`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  function clearFiles() {
    if (inputRef.current) inputRef.current.value = "";
    setFileNames([]);
  }

  return (
    <div className="attachment-card">
      <label className="check-row">
        <input checked={checked} disabled={disabled} name="attachmentTypes" onChange={(event) => onToggle(event.target.checked)} type="checkbox" value={type} />
        {label}
      </label>
      <label className="file-row attachment-file" htmlFor={fileId}>
        <input
          accept="application/pdf,image/png,image/jpeg"
          disabled={disabled || !checked}
          id={fileId}
          multiple
          name={name}
          onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))}
          ref={inputRef}
          required={checked}
          type="file"
        />
      </label>
      {fileNames.length ? (
        <div className="attachment-file-list">
          <span>
            {fileNames.length} file{fileNames.length > 1 ? "s" : ""} selected: {fileNames.join(", ")}
          </span>
          <button className="ghost-button" onClick={clearFiles} type="button">
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
