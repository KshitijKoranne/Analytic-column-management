import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { AuthHeroLayout } from "@/components/auth-hero-layout";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;

  return (
    <AuthHeroLayout>
      <h1 className="login-title">Welcome back</h1>
      <p className="auth-card-subtitle">Sign in to Column Management</p>
      <form action={loginAction} className="login-form">
        <div className="field field-floating">
          <input autoComplete="email" id="email" name="email" placeholder=" " required type="email" />
          <label htmlFor="email">Email</label>
        </div>
        <div className="field field-floating">
          <input autoComplete="current-password" id="password" name="password" placeholder=" " required type="password" />
          <label htmlFor="password">Password</label>
        </div>
        {params?.error ? (
          <div className="check-row">
            <AlertCircle size={15} />
            <span>Invalid sign in</span>
          </div>
        ) : null}
        {params?.success === "password_reset" ? <div className="module-notice module-notice-success">Password reset completed</div> : null}
        <SubmitButton pendingLabel="Logging in…">
          Login
        </SubmitButton>
        <Link className="login-link" href="/forgot-password">
          Forgot password
        </Link>
      </form>
    </AuthHeroLayout>
  );
}
