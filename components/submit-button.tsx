"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel = "Submitting…",
  className = "primary-button",
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} aria-busy={pending} className={className} disabled={pending || disabled} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
