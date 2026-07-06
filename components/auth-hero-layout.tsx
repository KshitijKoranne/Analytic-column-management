import { Atom } from "lucide-react";
import type { ReactNode } from "react";
import { LoginIllustration } from "@/components/login-illustration";
import { LoginVisual } from "@/components/login-visual";

export function AuthHeroLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-hero-shell">
      <section aria-hidden="true" className="auth-visual">
        <div className="auth-visual-blob one" />
        <div className="auth-visual-blob two" />
        <LoginVisual />
        <LoginIllustration />
        <div className="auth-visual-scrim" />
        <div className="auth-visual-copy">
          <span className="auth-visual-kicker">
            <Atom size={14} />
            Column Management
          </span>
          <h2>Analytical column lifecycle, under control.</h2>
          <p>Receipt to destruction, fully traceable, e-signed at every step.</p>
        </div>
      </section>
      <section className="auth-card-shell">
        <div className="login-panel auth-card">
          <div className="auth-card-brand">
            <span className="brand-mark">CM</span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
