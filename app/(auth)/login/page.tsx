import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/app/actions";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1 className="login-title">Column Management</h1>
        <form action={loginAction} className="login-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input autoComplete="email" id="email" name="email" required type="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input autoComplete="current-password" id="password" name="password" required type="password" />
          </div>
          {params?.error ? (
            <div className="check-row">
              <AlertCircle size={15} />
              <span>Invalid sign in</span>
            </div>
          ) : null}
          {params?.success === "password_reset" ? <div className="module-notice">Password reset completed</div> : null}
          <button className="primary-button" type="submit">
            Login
          </button>
          <Link className="login-link" href="/forgot-password">
            Forgot password
          </Link>
        </form>
      </section>
    </main>
  );
}
