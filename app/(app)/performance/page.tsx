import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { ColumnSelectField } from "@/components/column-select-field";
import { ESignFields } from "@/components/e-sign-fields";
import { PerformanceParametersField } from "@/components/performance-parameters-field";
import { RequiredLabel } from "@/components/required-label";
import { SubmitButton } from "@/components/submit-button";
import { createPerformanceAction } from "@/app/actions";
import { canAccess, requirePermission } from "@/lib/access";
import { getColumns, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { canRecordPerformance } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function PerformancePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("performance:read");
  const params = await searchParams;
  const [records, columns] = await Promise.all([getModuleRecords("performance"), getColumns()]);
  const notice = await transactionNotice(params);
  const canCreate = canAccess(access, "performance:create");
  const showNew = canCreate && params?.new === "1";
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const page = typeof params?.page === "string" ? params.page : undefined;
  const performanceColumns = columns.filter((column) => canRecordPerformance(column.status));
  const hasPerformanceColumns = performanceColumns.length > 0;
  const today = new Date().toISOString().slice(0, 10);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="performance" title="Performance">
      <ActivityScreen
        actionLabel={canCreate ? "New entry" : undefined}
        basePath="/performance"
        mode={showNew ? "new" : "record"}
        notice={notice}
        page={page}
        records={records}
        searchPlaceholder="Search column, method, result"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title="New entry"
        wideNew
      >
        <form action={createPerformanceAction} className="form-grid">
          <ColumnSelectField columns={performanceColumns} />
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="method">Method</RequiredLabel>
              <input id="method" name="method" required />
            </div>
            <div className="field">
              <RequiredLabel htmlFor="performedDate">Date</RequiredLabel>
              <input defaultValue={today} id="performedDate" name="performedDate" required type="date" />
            </div>
          </div>
          <div className="section-label">Qualification parameters</div>
          <PerformanceParametersField />
          <div className="section-label">Attachments</div>
          <label className="file-row">
            <input accept="application/pdf,image/png,image/jpeg" multiple name="attachments" type="file" />
          </label>
          <div className="field">
            <label htmlFor="remarks">Remarks</label>
            <textarea id="remarks" name="remarks" />
          </div>
          <ESignFields action="performance-record" meaning="Record performance qualification" signerName={signerName} />
          <div className="actions">
            <SubmitButton disabled={!hasPerformanceColumns} pendingLabel="Submitting…">
              {hasPerformanceColumns ? "Submit" : "No column eligible"}
            </SubmitButton>
          </div>
        </form>
      </ActivityScreen>
    </AppShell>
  );
}
