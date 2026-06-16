import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { createReceiptAction } from "@/app/actions";
import { requirePermission } from "@/lib/access";
import { getMasters, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { locations } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("receipt:read");
  const [records, masters] = await Promise.all([getModuleRecords("receipt"), getMasters()]);
  const notice = await transactionNotice(searchParams);
  const activeMasters = masters.filter((master) => master.status === "active");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell active="receipt" title="Receipt">
      <ActivityScreen actionLabel="New receipt" notice={notice} records={records} title="New receipt">
        <form action={createReceiptAction} className="form-grid">
          <div className="field">
            <label htmlFor="columnMasterId">Column master</label>
            <select id="columnMasterId" name="columnMasterId">
              {activeMasters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.name}
                </option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="serialNumber">Serial number</label>
              <input id="serialNumber" name="serialNumber" />
            </div>
            <div className="field">
              <label htmlFor="supplier">Supplier</label>
              <input id="supplier" name="supplier" />
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="receivedDate">Received date</label>
              <input defaultValue={today} id="receivedDate" name="receivedDate" type="date" />
            </div>
            <div className="field">
              <label htmlFor="storageLocation">Storage location</label>
              <select id="storageLocation" name="storageLocation" defaultValue={locations[0]}>
                {locations.map((location) => (
                  <option key={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="condition">Condition</label>
            <select id="condition" name="condition" defaultValue="Intact">
              <option>Intact</option>
              <option>Damaged package</option>
              <option>Quarantine</option>
            </select>
          </div>
          <div className="section-label">Attachments</div>
          <label className="file-row">
            <input accept="application/pdf,image/png,image/jpeg" name="attachment" type="file" />
          </label>
          <div className="field">
            <label htmlFor="remarks">Remarks</label>
            <textarea id="remarks" name="remarks" />
          </div>
          <div className="actions">
            <button className="secondary-button" type="button">
              Save draft
            </button>
            <button className="primary-button" type="submit">
              Submit
            </button>
          </div>
        </form>
      </ActivityScreen>
    </AppShell>
  );
}
