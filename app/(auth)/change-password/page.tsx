import { redirect } from "next/navigation";
import { changeOwnPasswordAction } from "@/app/actions";
import { NoticeBanner } from "@/components/notice-banner";
import { SubmitButton } from "@/components/submit-button";
import { auth } from "@/auth";
import { transactionNotice } from "@/lib/notices";

export default async function ChangePasswordPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const notice = await transactionNotice(searchParams);

  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1 className="login-title">Change password</h1>
        <NoticeBanner notice={notice} />
        <form action={changeOwnPasswordAction} className="login-form">
          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <input autoComplete="current-password" id="currentPassword" name="currentPassword" required type="password" />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input autoComplete="new-password" id="newPassword" minLength={8} name="newPassword" required type="password" />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input autoComplete="new-password" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" />
          </div>
          <SubmitButton pendingLabel="Updating…">
            Update password
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
