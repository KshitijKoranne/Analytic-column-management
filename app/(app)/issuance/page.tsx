import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { ESignFields } from "@/components/e-sign-fields";
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
  const access = await requirePermission("issuance:read");
  const params = await searchParams;
  const [records, columns, people] = await Promise.all([getModuleRecords("issuance"), getColumns(), getPersonnelOptions()]);
  const notice = await transactionNotice(params);
  const showNew = params?.new === "1";
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const issuableColumns = columns.filter((column) => canIssueColumn(column.status));
  const hasIssuableColumns = issuableColumns.length > 0;
  const today = new Date().toISOString().slice(0, 10);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="issuance" title="Issuance">
      <ActivityScreen
        actionLabel="New issuance"
        basePath="/issuance"
        mode={showNew ? "new" : "record"}
        notice={notice}
        records={records}
        searchPlaceholder="Search issued column, method, holder"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title="New issuance"
        wideNew
      >
        <form action={createIssuanceAction} className="form-grid">
          <div className="field">
            <RequiredLabel htmlFor="columnId">Column ID</RequiredLabel>
            <select id="columnId" name="columnId" required>
              {!hasIssuableColumns && <option value="">No available columns</option>}
              {issuableColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.assetCode} · {column.storageLocation}
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
          <div className="field">
            <RequiredLabel htmlFor="issueDate">Issue date</RequiredLabel>
            <input defaultValue={today} id="issueDate" name="issueDate" required type="date" />
          </div>
          <div className="section-label">Dedicated use</div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="dedicatedProduct">Product</label>
              <input id="dedicatedProduct" name="dedicatedProduct" />
            </div>
            <div className="field">
              <label htmlFor="dedicatedTest">Test</label>
              <input id="dedicatedTest" name="dedicatedTest" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="remarks">Remarks</label>
            <textarea id="remarks" name="remarks" />
          </div>
          <ESignFields action="issuance-create" meaning="Issue column for use" signerName={signerName} />
          <div className="actions">
            <button className="primary-button" disabled={!hasIssuableColumns} type="submit">
              {hasIssuableColumns ? "Issue" : "No column available"}
            </button>
          </div>
        </form>
      </ActivityScreen>
    </AppShell>
  );
}
