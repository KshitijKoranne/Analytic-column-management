import Link from "next/link";
import { createMasterAction, updateMasterAction } from "@/app/actions";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";
import { SubmitButton } from "@/components/submit-button";
import type { ColumnMaster } from "@/lib/types";

const dimensionUnits = ["mm", "cm", "m", "micron"];
const manufacturers = [
  "Waters",
  "Agilent",
  "Thermo Fisher Scientific",
  "Shimadzu",
  "Phenomenex",
  "Merck",
  "Restek",
  "GL Sciences",
  "YMC",
  "Tosoh Bioscience",
  "Macherey-Nagel"
];

export function MasterForm({
  initialValue,
  mode = "create",
  signerName
}: {
  initialValue?: ColumnMaster;
  mode?: "create" | "edit";
  signerName?: string | null;
}) {
  const action = mode === "edit" ? updateMasterAction : createMasterAction;
  const manufacturerOptions = initialValue?.manufacturer && !manufacturers.includes(initialValue.manufacturer)
    ? [initialValue.manufacturer, ...manufacturers]
    : manufacturers;

  return (
    <form action={action} className="form-grid master-form">
      {initialValue ? <input name="masterId" type="hidden" value={initialValue.id} /> : null}
      <div className="two-col">
        <div className="field">
          <RequiredLabel htmlFor="columnType">Column type</RequiredLabel>
          <select defaultValue={initialValue?.columnType ?? "HPLC"} id="columnType" name="columnType" required>
            <option>HPLC</option>
            <option>UPLC</option>
            <option>GC</option>
            <option>IC</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <RequiredLabel htmlFor="manufacturer">Manufacturer</RequiredLabel>
          <select defaultValue={initialValue?.manufacturer ?? "Waters"} id="manufacturer" name="manufacturer" required>
            {manufacturerOptions.map((manufacturer) => (
              <option key={manufacturer}>{manufacturer}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="two-col">
        <div className="field">
          <RequiredLabel htmlFor="partNumber">Part number</RequiredLabel>
          <input defaultValue={initialValue?.partNumber} id="partNumber" name="partNumber" required />
        </div>
        <div className="field">
          <RequiredLabel htmlFor="packing">Packing</RequiredLabel>
          <input defaultValue={initialValue?.packing} id="packing" name="packing" required />
        </div>
      </div>

      <div className="section-label">Physical dimensions</div>
      <div className="dimension-grid">
        <DimensionField id="lengthValue" label="Length" unitName="lengthUnit" value={initialValue?.lengthValue} unitValue={initialValue?.lengthUnit} />
        <DimensionField id="diameterValue" label="Diameter" unitName="diameterUnit" value={initialValue?.diameterValue} unitValue={initialValue?.diameterUnit} />
        <DimensionField
          defaultUnit="micron"
          id="particleSizeValue"
          label="Particle size"
          unitName="particleSizeUnit"
          value={initialValue?.particleSizeValue}
          unitValue={initialValue?.particleSizeUnit}
        />
      </div>

      <div className="field">
        <label htmlFor="remarks">Remarks</label>
        <textarea id="remarks" name="remarks" />
      </div>
      <ESignFields
        action={mode === "edit" ? "master-update" : "master-submit"}
        meaning={mode === "edit" ? "Update column master details" : "Submit column master for activation"}
        signerName={signerName}
      />
      <div className="actions">
        <Link className="secondary-button" href="/masters">
          Cancel
        </Link>
        <SubmitButton pendingLabel={mode === "edit" ? "Updating…" : "Submitting…"}>
          {mode === "edit" ? "Update" : "Submit for review"}
        </SubmitButton>
      </div>
    </form>
  );
}

function DimensionField({
  defaultUnit = "mm",
  id,
  label,
  unitName,
  unitValue,
  value
}: {
  defaultUnit?: string;
  id: string;
  label: string;
  unitName: string;
  unitValue?: string;
  value?: string;
}) {
  return (
    <div className="unit-field">
      <div className="field">
        <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
        <input defaultValue={value} id={id} min="0.000001" name={id} required step="any" type="number" />
      </div>
      <div className="field">
        <RequiredLabel htmlFor={unitName}>Unit</RequiredLabel>
        <select defaultValue={dimensionUnits.includes(unitValue ?? "") ? unitValue : defaultUnit} id={unitName} name={unitName} required>
          {dimensionUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
