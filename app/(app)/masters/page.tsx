import { AppShell } from "@/components/app-shell";
import { ActivityScreen } from "@/components/activity-screen";
import { createMasterAction } from "@/app/actions";
import { getModuleRecords } from "@/lib/data";

export default async function MastersPage() {
  const records = await getModuleRecords("masters");

  return (
    <AppShell active="masters" title="Masters">
      <ActivityScreen actionLabel="New master" records={records} title="New master">
        <form action={createMasterAction} className="form-grid">
          <div className="field">
            <label htmlFor="name">Column master</label>
            <input id="name" name="name" />
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="columnType">Column type</label>
              <select id="columnType" name="columnType">
                <option>HPLC</option>
                <option>UPLC</option>
                <option>GC</option>
                <option>IC</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="manufacturer">Manufacturer</label>
              <input id="manufacturer" name="manufacturer" />
            </div>
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="partNumber">Part number</label>
              <input id="partNumber" name="partNumber" />
            </div>
            <div className="field">
              <label htmlFor="dimensions">Dimensions</label>
              <input id="dimensions" name="dimensions" />
            </div>
          </div>
          <div className="section-label">Parameters</div>
          <label className="check-row">
            <input defaultChecked type="checkbox" />
            Theoretical plates
          </label>
          <label className="check-row">
            <input defaultChecked type="checkbox" />
            Tailing factor
          </label>
          <label className="check-row">
            <input defaultChecked type="checkbox" />
            Resolution
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
