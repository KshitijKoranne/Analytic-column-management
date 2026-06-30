"use client";

import { useEffect, useId, useRef } from "react";
import { RequiredLabel } from "@/components/required-label";

export function ESignFields({
  action,
  meaning,
  requireReason = true,
  signerName
}: {
  action: string;
  meaning: string;
  requireReason?: boolean;
  signerName?: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const allowSubmitRef = useRef(false);
  const id = useId();
  const signer = signerName?.trim() || "Current user";

  function setSignatureFieldsEnabled(enabled: boolean) {
    if (passwordRef.current) passwordRef.current.disabled = !enabled;
    if (reasonRef.current) reasonRef.current.disabled = !enabled;
  }

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    formRef.current = form;
    setSignatureFieldsEnabled(false);

    function handleSubmit(event: SubmitEvent) {
      if (allowSubmitRef.current) return;
      event.preventDefault();
      setSignatureFieldsEnabled(true);
      dialogRef.current?.showModal();
      window.setTimeout(() => passwordRef.current?.focus(), 0);
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  function closeDialog() {
    setSignatureFieldsEnabled(false);
    dialogRef.current?.close();
  }

  function confirmSignature() {
    if (!passwordRef.current?.value) {
      passwordRef.current?.reportValidity();
      return;
    }

    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    allowSubmitRef.current = true;
    dialogRef.current?.close();
    form.requestSubmit();
  }

  return (
    <div className="signature-gate" ref={rootRef}>
      <input name="signatureAction" type="hidden" value={action} />
      <input name="signatureMeaning" type="hidden" value={meaning} />

      <dialog aria-labelledby={`${id}-title`} className="signature-dialog" ref={dialogRef}>
        <div className="signature-dialog-head">
          <h2 id={`${id}-title`}>E-signature</h2>
          <span>{meaning}</span>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${id}-signatureUser`}>User</label>
            <input id={`${id}-signatureUser`} readOnly value={signer} />
          </div>
          <div className="field">
            <RequiredLabel htmlFor={`${id}-signaturePassword`}>Password</RequiredLabel>
            <input autoComplete="current-password" id={`${id}-signaturePassword`} name="signaturePassword" ref={passwordRef} required type="password" />
          </div>
          <div className="field">
            {requireReason ? <RequiredLabel htmlFor={`${id}-signatureReason`}>Remarks / reason</RequiredLabel> : <label htmlFor={`${id}-signatureReason`}>Remarks / reason</label>}
            <input id={`${id}-signatureReason`} name="signatureReason" ref={reasonRef} required={requireReason} />
          </div>
        </div>

        <div className="actions">
          <button className="secondary-button" onClick={closeDialog} type="button">
            Cancel
          </button>
          <button className="primary-button" onClick={confirmSignature} type="button">
            Apply signature
          </button>
        </div>
      </dialog>
    </div>
  );
}
