import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { createPerformanceAction } from "@/app/actions";
import { getColumns, getModuleRecords } from "@/lib/data";
import { methods } from "@/lib/sample-data";

export default async function PerformancePage() {
  const [records, columns] = await Promise.all([getModuleRecords("performance"), getColumns()]);

  return (
    <AppShell active="performance" title="Performance">
      <ActivityScreen actionLabel="New entry" records={records} title="New entry">
        <form action={createPerformanceAction} className="form-grid">
          <div className="field">
            <label htmlFor="columnId">Column ID</label>
            <select id="columnId" name="columnId">
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.assetCode}
                </option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="method">Method</label>
              <select id="method" name="method" defaultValue={methods[0]}>
                {methods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="performedDate">Date</label>
              <input id="performedDate" name="performedDate" type="date" />
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="plates">Theoretical plates</label>
              <input id="plates" name="plates" inputMode="numeric" />
            </div>
            <div className="field">
              <label htmlFor="tailing">Tailing factor</label>
              <input id="tailing" name="tailing" inputMode="decimal" />
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="resolution">Resolution</label>
              <input id="resolution" name="resolution" inputMode="decimal" />
            </div>
            <div className="field">
              <label htmlFor="pressure">Pressure</label>
              <input id="pressure" name="pressure" inputMode="numeric" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="result">Result</label>
            <select id="result" name="result" defaultValue="pass">
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
          <div className="section-label">Attachments</div>
          <label className="file-row">
            <input name="attachment" type="file" />
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
