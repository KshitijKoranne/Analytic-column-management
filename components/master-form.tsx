import { createMasterAction } from "@/app/actions";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";

const dimensionUnits = ["mm", "cm", "m", "micron"];

export function MasterForm({ signerName }: { signerName?: string | null }) {
  return (
    <form action={createMasterAction} className="form-grid master-form">
      <div className="field">
        <RequiredLabel htmlFor="name">Column master</RequiredLabel>
        <input id="name" name="name" required />
      </div>
      <div className="two-col">
        <div className="field">
          <RequiredLabel htmlFor="columnType">Column type</RequiredLabel>
          <select id="columnType" name="columnType" required>
            <option>HPLC</option>
            <option>UPLC</option>
            <option>GC</option>
            <option>IC</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <RequiredLabel htmlFor="manufacturer">Manufacturer</RequiredLabel>
          <input id="manufacturer" name="manufacturer" required />
        </div>
      </div>
      <div className="field">
        <RequiredLabel htmlFor="partNumber">Part number</RequiredLabel>
        <input id="partNumber" name="partNumber" required />
      </div>

      <div className="section-label">Dimensions</div>
      <datalist id="dimension-units">
        {dimensionUnits.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <div className="dimension-grid">
        <DimensionField id="diameterValue" label="Diameter" unitName="diameterUnit" />
        <DimensionField id="lengthValue" label="Length" unitName="lengthUnit" />
        <DimensionField defaultUnit="micron" id="particleSizeValue" label="Particle size" unitName="particleSizeUnit" />
      </div>

      <div className="field">
        <RequiredLabel htmlFor="packing">Packing</RequiredLabel>
        <input id="packing" name="packing" required />
      </div>

      <div className="field">
        <label htmlFor="remarks">Remarks</label>
        <textarea id="remarks" name="remarks" />
      </div>
      <ESignFields action="master-submit" meaning="Submit column master for activation" signerName={signerName} />
      <div className="actions">
        <button className="primary-button" type="submit">
          Submit
        </button>
      </div>
    </form>
  );
}

function DimensionField({ defaultUnit = "mm", id, label, unitName }: { defaultUnit?: string; id: string; label: string; unitName: string }) {
  return (
    <div className="unit-field">
      <div className="field">
        <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
        <input id={id} name={id} required step="any" type="number" />
      </div>
      <div className="field">
        <RequiredLabel htmlFor={unitName}>Unit</RequiredLabel>
        <input defaultValue={defaultUnit} id={unitName} list="dimension-units" name={unitName} required />
      </div>
    </div>
  );
}
