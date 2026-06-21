import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";
import { createPerformanceAction } from "@/app/actions";
import { requirePermission } from "@/lib/access";
import { getColumns, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { methods } from "@/lib/sample-data";
import { canRecordPerformance } from "@/lib/workflows";

export const dynamic = "force-dynamic";

const qualificationParameters = [
  { key: "plates", label: "Theoretical plates", unit: "N", low: "2000", high: "" },
  { key: "tailing", label: "Tailing factor", unit: "", low: "", high: "2" },
  { key: "resolution", label: "Resolution", unit: "", low: "2", high: "" },
  { key: "pressure", label: "Pressure", unit: "bar", low: "", high: "" }
];

export default async function PerformancePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("performance:read");
  const params = await searchParams;
  const [records, columns] = await Promise.all([getModuleRecords("performance"), getColumns()]);
  const notice = await transactionNotice(params);
  const showNew = params?.new === "1";
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const performanceColumns = columns.filter((column) => canRecordPerformance(column.status));
  const today = new Date().toISOString().slice(0, 10);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="performance" title="Performance">
      <ActivityScreen
        actionLabel="New entry"
        basePath="/performance"
        mode={showNew ? "new" : "record"}
        notice={notice}
        records={records}
        searchPlaceholder="Search column, method, result"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title="New entry"
        wideNew
      >
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
          <div className="section-label">Qualification parameters</div>
          <div className="qualification-grid">
            <div className="qualification-head">Apply</div>
            <div className="qualification-head">Parameter</div>
            <div className="qualification-head">Value</div>
            <div className="qualification-head">Min</div>
            <div className="qualification-head">Max</div>
            {qualificationParameters.map((parameter) => (
              <div className="qualification-row" key={parameter.key}>
                <label className="check-row qualification-check">
                  <input defaultChecked={parameter.key !== "pressure"} name={`${parameter.key}Applied`} type="checkbox" value="yes" />
                </label>
                <div className="field">
                  <label htmlFor={`${parameter.key}Value`}>{parameter.label}</label>
                  <input aria-label={`${parameter.label} unit`} readOnly value={parameter.unit} />
                </div>
                <div className="field">
                  <label htmlFor={`${parameter.key}Value`}>Observed</label>
                  <input id={`${parameter.key}Value`} inputMode="decimal" name={`${parameter.key}Value`} />
                </div>
                <div className="field">
                  <label htmlFor={`${parameter.key}Low`}>Min</label>
                  <input defaultValue={parameter.low} id={`${parameter.key}Low`} inputMode="decimal" name={`${parameter.key}Low`} />
                </div>
                <div className="field">
                  <label htmlFor={`${parameter.key}High`}>Max</label>
                  <input defaultValue={parameter.high} id={`${parameter.key}High`} inputMode="decimal" name={`${parameter.key}High`} />
                </div>
              </div>
            ))}
          </div>
          <div className="section-label">Attachments</div>
          <label className="file-row">
            <input accept="application/pdf,image/png,image/jpeg" name="attachment" type="file" />
          </label>
          <div className="field">
            <label htmlFor="remarks">Remarks</label>
            <textarea id="remarks" name="remarks" />
          </div>
          <ESignFields action="performance-record" meaning="Record performance qualification" signerName={signerName} />
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
