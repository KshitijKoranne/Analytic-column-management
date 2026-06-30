"use client";

import { useMemo, useState } from "react";
import { createReceiptAction } from "@/app/actions";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";
import type { ColumnMaster } from "@/lib/types";

export function ReceiptForm({
  masters,
  signerName,
  today
}: {
  masters: ColumnMaster[];
  signerName?: string | null;
  today: string;
}) {
  const [masterId, setMasterId] = useState(masters[0]?.id ?? "");
  const [attachmentTypes, setAttachmentTypes] = useState<string[]>([]);
  const selected = useMemo(() => masters.find((master) => master.id === masterId), [masterId, masters]);
  const hasMasters = masters.length > 0;
  const isAttachmentRequired = (type: string) => attachmentTypes.includes(type);

  function toggleAttachmentType(type: string, checked: boolean) {
    setAttachmentTypes((current) => (checked ? [...new Set([...current, type])] : current.filter((item) => item !== type)));
  }

  return (
    <form action={createReceiptAction} className="form-grid">
      <div className="field">
        <RequiredLabel htmlFor="columnMasterId">Part number</RequiredLabel>
        <select disabled={!hasMasters} id="columnMasterId" name="columnMasterId" onChange={(event) => setMasterId(event.target.value)} required value={masterId}>
          {masters.map((master) => (
            <option key={master.id} value={master.id}>
              {master.partNumber}
            </option>
          ))}
        </select>
      </div>

      <div className="two-col">
        <MasterField label="Column type" name="masterColumnType" value={selected?.columnType ?? ""} />
        <MasterField label="Manufacturer" name="masterManufacturer" value={selected?.manufacturer ?? ""} />
      </div>
      <div className="two-col">
        <MasterField label="Packing" name="masterPacking" value={selected?.packing ?? ""} />
        <MasterField label="Dimensions" name="masterDimensions" value={selected?.dimensions ?? ""} />
      </div>

      <div className="two-col">
        <div className="field">
          <RequiredLabel htmlFor="serialNumber">Serial number</RequiredLabel>
          <input disabled={!hasMasters} id="serialNumber" name="serialNumber" required />
        </div>
        <div className="field">
          <label htmlFor="supplier">Supplier</label>
          <input disabled={!hasMasters} id="supplier" name="supplier" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="poNumber">PO number</label>
        <input disabled={!hasMasters} id="poNumber" name="poNumber" />
      </div>
      <div className="field">
        <RequiredLabel htmlFor="receivedDate">Received date</RequiredLabel>
        <input defaultValue={today} disabled={!hasMasters} id="receivedDate" name="receivedDate" required type="date" />
      </div>
      <input name="storageLocation" type="hidden" value="QC Store" />
      <div className="field">
        <RequiredLabel htmlFor="condition">Condition</RequiredLabel>
        <select defaultValue="Intact" disabled={!hasMasters} id="condition" name="condition" required>
          <option>Intact</option>
          <option>Damaged</option>
        </select>
      </div>
      <div className="section-label">Attachments</div>
      <div className="role-chip-grid">
        <label className="check-row">
          <input disabled={!hasMasters} name="attachmentTypes" onChange={(event) => toggleAttachmentType("coa", event.target.checked)} type="checkbox" value="coa" />
          CoA
        </label>
        <label className="check-row">
          <input disabled={!hasMasters} name="attachmentTypes" onChange={(event) => toggleAttachmentType("po", event.target.checked)} type="checkbox" value="po" />
          PO
        </label>
        <label className="check-row">
          <input disabled={!hasMasters} name="attachmentTypes" onChange={(event) => toggleAttachmentType("other", event.target.checked)} type="checkbox" value="other" />
          Other
        </label>
      </div>
      <AttachmentField disabled={!hasMasters || !isAttachmentRequired("coa")} label="CoA attachment" name="attachments_coa" required={isAttachmentRequired("coa")} />
      <AttachmentField disabled={!hasMasters || !isAttachmentRequired("po")} label="PO attachment" name="attachments_po" required={isAttachmentRequired("po")} />
      <AttachmentField disabled={!hasMasters || !isAttachmentRequired("other")} label="Other attachment" name="attachments_other" required={isAttachmentRequired("other")} />
      <div className="field">
        <label htmlFor="remarks">Remarks</label>
        <textarea disabled={!hasMasters} id="remarks" name="remarks" />
      </div>
      <ESignFields action="receipt-submit" meaning="Submit column receipt" signerName={signerName} />
      <div className="actions">
        <button className="primary-button" disabled={!hasMasters} type="submit">
          Submit
        </button>
      </div>
    </form>
  );
}

function MasterField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="field">
      <RequiredLabel htmlFor={name}>{label}</RequiredLabel>
      <input defaultValue={value} id={name} key={`${name}-${value}`} name={name} readOnly={Boolean(value)} required />
    </div>
  );
}

function AttachmentField({ disabled, label, name, required }: { disabled: boolean; label: string; name: string; required: boolean }) {
  return (
    <div className="field">
      {required ? <RequiredLabel htmlFor={name}>{label}</RequiredLabel> : <label htmlFor={name}>{label}</label>}
      <label className="file-row">
        <input accept="application/pdf,image/png,image/jpeg" disabled={disabled} id={name} multiple name={name} required={required} type="file" />
      </label>
    </div>
  );
}
