import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { RequiredLabel } from "@/components/required-label";
import { createIssuanceAction } from "@/app/actions";
import { requirePermission } from "@/lib/access";
import { getColumns, getModuleRecords, getPersonnelOptions } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { methods } from "@/lib/sample-data";
import { canIssueColumn } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function IssuancePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("issuance:read");
  const [records, columns, people] = await Promise.all([getModuleRecords("issuance"), getColumns(), getPersonnelOptions()]);
  const notice = await transactionNotice(searchParams);
  const issuableColumns = columns.filter((column) => canIssueColumn(column.status));
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <AppShell active="issuance" title="Issuance">
      <ActivityScreen actionLabel="New issuance" notice={notice} records={records} title="New issuance" wideNew>
        <form action={createIssuanceAction} className="form-grid">
          <div className="field">
            <RequiredLabel htmlFor="columnId">Column ID</RequiredLabel>
            <select id="columnId" name="columnId" required>
              {issuableColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.assetCode}
                </option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="issueTo">Issue to</RequiredLabel>
              <select id="issueTo" name="issueTo" required>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{person.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <RequiredLabel htmlFor="purpose">Purpose</RequiredLabel>
              <select id="purpose" name="purpose" defaultValue={methods[0]} required>
                {methods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="issueDate">Issue date</RequiredLabel>
              <input defaultValue={today} id="issueDate" name="issueDate" required type="date" />
            </div>
            <div className="field">
              <RequiredLabel htmlFor="expectedReturnDate">Expected return</RequiredLabel>
              <input defaultValue={nextWeek} id="expectedReturnDate" name="expectedReturnDate" required type="date" />
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
