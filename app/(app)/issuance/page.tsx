import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { createIssuanceAction } from "@/app/actions";
import { getColumns, getModuleRecords, getPersonnelOptions } from "@/lib/data";
import { methods } from "@/lib/sample-data";

export default async function IssuancePage() {
  const [records, columns, people] = await Promise.all([getModuleRecords("issuance"), getColumns(), getPersonnelOptions()]);

  return (
    <AppShell active="issuance" title="Issuance">
      <ActivityScreen actionLabel="New issuance" records={records} title="New issuance">
        <form action={createIssuanceAction} className="form-grid">
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
              <label htmlFor="issueTo">Issue to</label>
              <select id="issueTo" name="issueTo">
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{person.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="purpose">Purpose</label>
              <select id="purpose" name="purpose" defaultValue={methods[0]}>
                {methods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="issueDate">Issue date</label>
              <input id="issueDate" name="issueDate" type="date" />
            </div>
            <div className="field">
              <label htmlFor="expectedReturnDate">Expected return</label>
              <input id="expectedReturnDate" name="expectedReturnDate" type="date" />
            </div>
          </div>
          <label className="check-row">
            <input defaultChecked type="checkbox" />
            Recipient acknowledgement
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
              Issue
            </button>
          </div>
        </form>
      </ActivityScreen>
    </AppShell>
  );
}
