import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";
import { createReceiptAction } from "@/app/actions";
import { requirePermission } from "@/lib/access";
import { getMasters, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("receipt:read");
  const params = await searchParams;
  const [records, masters] = await Promise.all([getModuleRecords("receipt"), getMasters()]);
  const notice = await transactionNotice(params);
  const showNew = params?.new === "1";
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const activeMasters = masters.filter((master) => master.status === "active");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell active="receipt" title="Receipt">
      <ActivityScreen
        actionLabel="New receipt"
        basePath="/receipt"
        mode={showNew ? "new" : "record"}
        notice={notice}
        records={records}
        searchPlaceholder="Search column, type, make, supplier"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title="New receipt"
        wideNew
      >
        <form action={createReceiptAction} className="form-grid">
          <div className="field">
            <RequiredLabel htmlFor="columnMasterId">Column master</RequiredLabel>
            <select id="columnMasterId" name="columnMasterId" required>
              {activeMasters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.columnType} · {master.partNumber} · {master.manufacturer} · {master.packing} · {master.dimensions}
                </option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="serialNumber">Serial number</RequiredLabel>
              <input id="serialNumber" name="serialNumber" required />
            </div>
            <div className="field">
              <RequiredLabel htmlFor="supplier">Supplier</RequiredLabel>
              <input id="supplier" name="supplier" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="poNumber">PO number</label>
            <input id="poNumber" name="poNumber" />
          </div>
          <div className="field">
            <RequiredLabel htmlFor="receivedDate">Received date</RequiredLabel>
            <input defaultValue={today} id="receivedDate" name="receivedDate" required type="date" />
          </div>
          <input name="storageLocation" type="hidden" value="QC Store" />
          <div className="field">
            <RequiredLabel htmlFor="condition">Condition</RequiredLabel>
            <select id="condition" name="condition" defaultValue="Intact" required>
              <option>Intact</option>
              <option>Damaged</option>
            </select>
          </div>
          <div className="section-label">Attachments</div>
          <div className="role-chip-grid">
            <label className="check-row">
              <input name="attachmentTypes" type="checkbox" value="coa" />
              CoA
            </label>
            <label className="check-row">
              <input name="attachmentTypes" type="checkbox" value="po" />
              PO
            </label>
            <label className="check-row">
              <input name="attachmentTypes" type="checkbox" value="other" />
              Other
            </label>
          </div>
          <label className="file-row">
            <input accept="application/pdf,image/png,image/jpeg" multiple name="attachments" type="file" />
          </label>
          <div className="field">
            <label htmlFor="remarks">Remarks</label>
            <textarea id="remarks" name="remarks" />
          </div>
          <ESignFields action="receipt-submit" meaning="Submit column receipt" />
          <div className="actions">
            <button className="primary-button" type="submit">
              Submit
            </button>
          </div>
        </form>
      </ActivityScreen>
    </AppShell>
  );
}
