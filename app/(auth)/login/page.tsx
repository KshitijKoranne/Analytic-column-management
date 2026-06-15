import { AlertCircle } from "lucide-react";
import { loginAction } from "@/app/actions";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1 className="login-title">Column Management</h1>
        <form action={loginAction} className="login-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input autoComplete="email" id="email" name="email" type="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input autoComplete="current-password" id="password" name="password" type="password" />
          </div>
          {params?.error ? (
            <div className="check-row">
              <AlertCircle size={15} />
              <span>Invalid sign in</span>
            </div>
          ) : null}
          <button className="primary-button" type="submit">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}
