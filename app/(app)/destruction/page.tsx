import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";
import { SubmitButton } from "@/components/submit-button";
import { createDestructionAction } from "@/app/actions";
import { canAccess, requirePermission } from "@/lib/access";
import { getColumns, getModuleRecords } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { canRequestDestruction } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function DestructionPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("destruction:read");
  const params = await searchParams;
  const [records, columns] = await Promise.all([getModuleRecords("destruction"), getColumns()]);
  const notice = await transactionNotice(params);
  const canCreate = canAccess(access, "destruction:create");
  const showNew = canCreate && params?.new === "1";
  const selectedId = typeof params?.record === "string" ? params.record : undefined;
  const statusFilter = typeof params?.status === "string" ? params.status : undefined;
  const searchQuery = typeof params?.q === "string" ? params.q : undefined;
  const page = typeof params?.page === "string" ? params.page : undefined;
  const destructibleColumns = columns.filter((column) => canRequestDestruction(column.status));
  const hasDestructibleColumns = destructibleColumns.length > 0;
  const today = new Date().toISOString().slice(0, 10);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="destruction" title="Destruction">
      <ActivityScreen
        actionLabel={canCreate ? "New request" : undefined}
        basePath="/destruction"
        mode={showNew ? "new" : "record"}
        notice={notice}
        page={page}
        records={records}
        searchPlaceholder="Search column, reason, requester"
        searchQuery={searchQuery}
        selectedId={selectedId}
        statusFilter={statusFilter}
        title="New request"
        wideNew
      >
        <form action={createDestructionAction} className="form-grid">
          <div className="field">
            <RequiredLabel htmlFor="columnId">Column ID</RequiredLabel>
            <select id="columnId" name="columnId" required>
              {!hasDestructibleColumns && <option value="">No eligible columns</option>}
              {destructibleColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.assetCode}
                </option>
              ))}
            </select>
          </div>
          <div className="two-col">
            <div className="field">
              <RequiredLabel htmlFor="reason">Reason</RequiredLabel>
              <select id="reason" name="reason" defaultValue="Repeated suitability failure" required>
                <option>Repeated suitability failure</option>
                <option>Maximum use reached</option>
                <option>Physical damage</option>
                <option>Expired</option>
              </select>
            </div>
            <div className="field">
              <RequiredLabel htmlFor="requestedDate">Request date</RequiredLabel>
              <input defaultValue={today} id="requestedDate" name="requestedDate" required type="date" />
            </div>
          </div>
          <div className="field">
            <RequiredLabel htmlFor="disposalMethod">Disposal method</RequiredLabel>
            <select id="disposalMethod" name="disposalMethod" defaultValue="Controlled disposal" required>
              <option>Controlled disposal</option>
              <option>Vendor return</option>
              <option>Waste management</option>
            </select>
          </div>
          <div className="check-row">
            <span>Technical review</span>
            <span>Final approval</span>
          </div>
          <div className="section-label">Attachments</div>
          <label className="file-row">
            <input accept="application/pdf,image/png,image/jpeg" multiple name="attachments" type="file" />
          </label>
          <div className="field">
            <RequiredLabel htmlFor="remarks">Remarks</RequiredLabel>
            <textarea id="remarks" name="remarks" required />
          </div>
          <ESignFields action="destruction-request" meaning="Request column discard" signerName={signerName} />
          <div className="actions">
            <SubmitButton disabled={!hasDestructibleColumns} pendingLabel="Submitting…">
              {hasDestructibleColumns ? "Submit" : "No column eligible"}
            </SubmitButton>
          </div>
        </form>
      </ActivityScreen>
    </AppShell>
  );
}
