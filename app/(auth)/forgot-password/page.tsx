import Link from "next/link";
import { resetForgottenPasswordAction } from "@/app/actions";
import { createCaptcha } from "@/lib/captcha";
import { getRecoveryQuestion } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email.toLowerCase() : "";
  const question = email ? await getRecoveryQuestion(email) : undefined;
  const captcha = createCaptcha();
  const notice = await transactionNotice(params);

  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1 className="login-title">Reset password</h1>
        {notice ? <div className="module-notice">{notice}</div> : null}
        {!email || !question ? (
          <form action="/forgot-password" className="login-form" method="get">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input autoComplete="email" defaultValue={email} id="email" name="email" required type="email" />
            </div>
            {email && !question ? <div className="check-row">Recovery is not configured for this user</div> : null}
            <button className="primary-button" type="submit">
              Continue
            </button>
            <Link className="login-link" href="/login">
              Back to login
            </Link>
          </form>
        ) : (
          <form action={resetForgottenPasswordAction} className="login-form">
            <input name="email" type="hidden" value={email} />
            <input name="captchaToken" type="hidden" value={captcha.token} />
            <div className="field">
              <label htmlFor="securityAnswer">{question}</label>
              <input autoComplete="off" id="securityAnswer" name="securityAnswer" required />
            </div>
            <div className="field">
              <label htmlFor="captchaAnswer">Captcha: {captcha.question}</label>
              <input id="captchaAnswer" inputMode="numeric" name="captchaAnswer" required />
            </div>
            <div className="field">
              <label htmlFor="newPassword">New password</label>
              <input autoComplete="new-password" id="newPassword" minLength={8} name="newPassword" required type="password" />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input autoComplete="new-password" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" />
            </div>
            <button className="primary-button" type="submit">
              Reset password
            </button>
            <Link className="login-link" href="/login">
              Back to login
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
