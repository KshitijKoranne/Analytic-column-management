"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createMasterAction } from "@/app/actions";
import { RequiredLabel } from "@/components/required-label";

const dimensionUnits = ["mm", "cm", "m", "um", "inch"];
const parameterUnits = ["", "N", "%", "mm", "um", "min", "mL/min", "MPa", "bar", "pH"];

const defaultParameters = [
  { label: "Theoretical plates", unit: "N", inputType: "number", required: true, lowLimit: "2000", highLimit: "" },
  { label: "Tailing factor", unit: "", inputType: "number", required: true, lowLimit: "", highLimit: "2" },
  { label: "Resolution", unit: "", inputType: "number", required: true, lowLimit: "2", highLimit: "" }
];

type ParameterRow = (typeof defaultParameters)[number];

export function MasterForm() {
  const [parameters, setParameters] = useState<ParameterRow[]>(defaultParameters);

  function addParameter() {
    setParameters((rows) => [...rows, { label: "", unit: "", inputType: "number", required: false, lowLimit: "", highLimit: "" }]);
  }

  function removeParameter(index: number) {
    setParameters((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  }

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
        <DimensionField id="internalDiameter" label="Internal diameter" unitName="internalDiameterUnit" />
        <DimensionField id="length" label="Length" unitName="lengthUnit" />
        <DimensionField id="particleSize" label="Particle size" unitName="particleSizeUnit" />
      </div>

      <div className="section-label">Parameters</div>
      <datalist id="parameter-units">
        {parameterUnits.map((unit) => (
          <option key={unit || "blank"} value={unit} />
        ))}
      </datalist>
      <input name="parameterCount" type="hidden" value={parameters.length} />
      <div className="parameter-stack">
        {parameters.map((parameter, index) => (
          <div className="parameter-row" key={index}>
            <div className="field">
              <RequiredLabel htmlFor={`parameter-${index}-label`}>Parameter</RequiredLabel>
              <input defaultValue={parameter.label} id={`parameter-${index}-label`} name={`parameter-${index}-label`} required />
            </div>
            <div className="field">
              <label htmlFor={`parameter-${index}-unit`}>Unit</label>
              <input defaultValue={parameter.unit} id={`parameter-${index}-unit`} list="parameter-units" name={`parameter-${index}-unit`} />
            </div>
            <div className="field">
              <label htmlFor={`parameter-${index}-type`}>Type</label>
              <select defaultValue={parameter.inputType} id={`parameter-${index}-type`} name={`parameter-${index}-type`}>
                <option value="number">Number</option>
                <option value="text">Text</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`parameter-${index}-low`}>Low limit</label>
              <input defaultValue={parameter.lowLimit} id={`parameter-${index}-low`} name={`parameter-${index}-low`} type="number" />
            </div>
            <div className="field">
              <label htmlFor={`parameter-${index}-high`}>High limit</label>
              <input defaultValue={parameter.highLimit} id={`parameter-${index}-high`} name={`parameter-${index}-high`} type="number" />
            </div>
            <label className="check-row parameter-required">
              <input defaultChecked={parameter.required} name={`parameter-${index}-required`} type="checkbox" value="yes" />
              Required
            </label>
            <button className="icon-button" onClick={() => removeParameter(index)} type="button">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button className="secondary-button add-row-button" onClick={addParameter} type="button">
        <Plus size={14} />
        Add parameter
      </button>

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
  );
}

function DimensionField({ id, label, unitName }: { id: string; label: string; unitName: string }) {
  return (
    <div className="unit-field">
      <div className="field">
        <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
        <input id={id} name={id} required type="number" />
      </div>
      <div className="field">
        <RequiredLabel htmlFor={unitName}>Unit</RequiredLabel>
        <input defaultValue="mm" id={unitName} list="dimension-units" name={unitName} required />
      </div>
    </div>
  );
}
