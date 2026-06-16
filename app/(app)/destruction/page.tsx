import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { createDestructionAction } from "@/app/actions";
import { requirePermission } from "@/lib/access";
import { getColumns, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { canRequestDestruction } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function DestructionPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("destruction:read");
  const [records, columns] = await Promise.all([getModuleRecords("destruction"), getColumns()]);
  const notice = await transactionNotice(searchParams);
  const destructibleColumns = columns.filter((column) => canRequestDestruction(column.status));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell active="destruction" title="Destruction">
      <ActivityScreen actionLabel="New request" notice={notice} records={records} title="New request">
        <form action={createDestructionAction} className="form-grid">
          <div className="field">
            <label htmlFor="columnId">Column ID</label>
            <select id="columnId" name="columnId">
              {destructibleColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.assetCode}
                </option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="reason">Reason</label>
              <select id="reason" name="reason" defaultValue="Repeated suitability failure">
                <option>Repeated suitability failure</option>
                <option>Maximum use reached</option>
                <option>Physical damage</option>
                <option>Expired</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="requestedDate">Request date</label>
              <input defaultValue={today} id="requestedDate" name="requestedDate" type="date" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="disposalMethod">Disposal method</label>
            <select id="disposalMethod" name="disposalMethod" defaultValue="Controlled disposal">
              <option>Controlled disposal</option>
              <option>Vendor return</option>
              <option>Waste management</option>
            </select>
          </div>
          <div className="check-row">
            <span>Technical review</span>
            <span>Manager approval</span>
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
