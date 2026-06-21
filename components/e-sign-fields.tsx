import { RequiredLabel } from "@/components/required-label";

export function ESignFields({ action, meaning }: { action: string; meaning: string }) {
  return (
    <div className="signature-panel">
      <input name="signatureAction" type="hidden" value={action} />
      <input name="signatureMeaning" type="hidden" value={meaning} />
      <div className="two-col">
        <div className="field">
          <RequiredLabel htmlFor={`${action}-signaturePassword`}>Signature password</RequiredLabel>
          <input autoComplete="current-password" id={`${action}-signaturePassword`} name="signaturePassword" required type="password" />
        </div>
        <div className="field">
          <label htmlFor={`${action}-signatureReason`}>Reason</label>
          <input id={`${action}-signatureReason`} name="signatureReason" />
        </div>
      </div>
    </div>
  );
}
