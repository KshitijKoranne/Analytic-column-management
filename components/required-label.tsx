import type { ReactNode } from "react";

export function RequiredLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label className="required-label" htmlFor={htmlFor}>
      {children}
      <span aria-hidden="true">*</span>
    </label>
  );
}
