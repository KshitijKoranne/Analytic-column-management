import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { RequiredLabel } from "@/components/required-label";
import { createPerformanceAction } from "@/app/actions";
import { requirePermission } from "@/lib/access";
import { getColumns, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { methods } from "@/lib/sample-data";
import { canRecordPerformance } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function PerformancePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("performance:read");
  const [records, columns] = await Promise.all([getModuleRecords("performance"), getColumns()]);
  const notice = await transactionNotice(searchParams);
  const performanceColumns = columns.filter((column) => canRecordPerformance(column.status));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell active="performance" title="Performance">
      <ActivityScreen actionLabel="New entry" notice={notice} records={records} title="New entry" wideNew>
        <form action={createPerformanceAction} className="form-grid">
          <div className="field">
            <RequiredLabel htmlFor="columnId">Column ID</RequiredLabel>
            <select id="columnId" name="columnId" required>
              {performanceColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.assetCode}
                </option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="method">Method</RequiredLabel>
              <select id="method" name="method" defaultValue={methods[0]} required>
                {methods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <RequiredLabel htmlFor="performedDate">Date</RequiredLabel>
              <input defaultValue={today} id="performedDate" name="performedDate" required type="date" />
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="plates">Theoretical plates</RequiredLabel>
              <input id="plates" name="plates" inputMode="numeric" required />
            </div>
            <div className="field">
              <RequiredLabel htmlFor="tailing">Tailing factor</RequiredLabel>
              <input id="tailing" name="tailing" inputMode="decimal" required />
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="resolution">Resolution</RequiredLabel>
              <input id="resolution" name="resolution" inputMode="decimal" required />
            </div>
            <div className="field">
              <RequiredLabel htmlFor="pressure">Pressure</RequiredLabel>
              <input id="pressure" name="pressure" inputMode="numeric" required />
            </div>
          </div>
          <div className="field">
            <RequiredLabel htmlFor="result">Result</RequiredLabel>
            <select id="result" name="result" defaultValue="pass" required>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
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
