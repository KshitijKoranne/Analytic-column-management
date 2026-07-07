import Link from "next/link";
import { CalendarDays, Check, Circle, GitBranch, KeyRound, ShieldCheck, ShieldPlus, UserPlus, Users } from "lucide-react";
import { createRoleAction, createUserAction, updateDisplaySettingAction, updatePasswordPolicyAction, updateUserAction, updateUserRecoveryAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { NoticeBanner } from "@/components/notice-banner";
import { ESignFields } from "@/components/e-sign-fields";
import { PermissionSelectionField } from "@/components/permission-selection-field";
import { RequiredLabel } from "@/components/required-label";
import { RoleAssignmentField } from "@/components/role-assignment-field";
import { SettingsRoles } from "@/components/settings-roles";
import { SubmitButton } from "@/components/submit-button";
import { canAccess, requirePermission } from "@/lib/access";
import { getDisplaySetting, getPasswordPolicySetting, getRoleSettings, getUserSettings } from "@/lib/data";
import { dateFormatOptions } from "@/lib/date-format";
import { transactionNotice } from "@/lib/notices";
import { defaultWorkflows } from "@/lib/workflows";

export const dynamic = "force-dynamic";

type SettingsSection = "users" | "new-user" | "new-role" | "rights" | "display" | "password-policy" | "workflows";

const settingsSections: Array<{
  key: SettingsSection;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  write?: boolean;
}> = [
  { key: "users", label: "Users", href: "/settings", icon: Users },
  { key: "new-user", label: "New user", href: "/settings?section=new-user", icon: UserPlus, write: true },
  { key: "new-role", label: "New role", href: "/settings?section=new-role", icon: ShieldPlus, write: true },
  { key: "rights", label: "Role rights", href: "/settings?section=rights", icon: KeyRound, write: true },
  { key: "display", label: "Display", href: "/settings?section=display", icon: CalendarDays, write: true },
  { key: "password-policy", label: "Password policy", href: "/settings?section=password-policy", icon: KeyRound, write: true },
  { key: "workflows", label: "Workflows", href: "/settings?section=workflows", icon: GitBranch }
];

const writeSections: SettingsSection[] = ["new-user", "new-role", "rights", "display", "password-policy"];

function activeSection(value?: string | string[]): SettingsSection {
  return value === "new-user" || value === "new-role" || value === "rights" || value === "display" || value === "password-policy" || value === "workflows" ? value : "users";
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("settings:read");
  const params = await searchParams;
  const [{ roles, permissions }, users, displaySetting, passwordPolicy] = await Promise.all([getRoleSettings(), getUserSettings(), getDisplaySetting(), getPasswordPolicySetting()]);
  const notice = await transactionNotice(params);
  const requestedSection = activeSection(params?.section);
  const canUpdateSettings = canAccess(access, "settings:update");
  const section = !canUpdateSettings && writeSections.includes(requestedSection) ? "users" : requestedSection;
  const visibleSections = settingsSections.filter((item) => canUpdateSettings || !item.write);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="settings" title="Settings">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="settings-title-row">
            <span>{settingsSections.find((item) => item.key === section)?.label ?? "Users"}</span>
          </div>
        </div>
        <NoticeBanner notice={notice} />
        <div className="detail-panel">
          <div className="settings-layout">
            <nav className="settings-menu" aria-label="Settings sections">
              {visibleSections.map((item) => {
                const Icon = item.icon;
                return (
                  <Link aria-current={section === item.key ? "page" : undefined} className={`settings-menu-link ${section === item.key ? "active" : ""}`} href={item.href} key={item.key}>
                    <Icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="settings-content">
              {section === "users" ? (
                <div className="settings-card">
                  <h2>Users</h2>
                  <div className="user-list">
                    {users.map((user) => (
                      <div className="user-row" key={user.id}>
                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                          <small>Password changed: {user.passwordChangedAt || "Not recorded"}</small>
                        </div>
                        <div className="user-role-stack">
                          <span>{user.isActive ? "Active" : "Inactive"} · {user.passwordExpired ? "Password due" : "Password valid"}</span>
                          <small>{user.roles.join(", ") || "No role"}</small>
                          <small>{user.hasRecoveryQuestion ? "Recovery set" : "Recovery missing"}</small>
                        </div>
                        {canUpdateSettings ? (
                          <div className="user-admin-actions">
                            <details className="user-admin-panel">
                              <summary>Access</summary>
                              <form action={updateUserAction} className="form-grid">
                                <input name="userId" type="hidden" value={user.id} />
                                <div className="field">
                                  <RequiredLabel htmlFor={`isActive-${user.id}`}>Account status</RequiredLabel>
                                  <select defaultValue={user.isActive ? "yes" : "no"} id={`isActive-${user.id}`} name="isActive" required>
                                    <option value="yes">Active</option>
                                    <option value="no">Inactive</option>
                                  </select>
                                </div>
                                <div className="section-label">Roles</div>
                                <RoleAssignmentField initialRoleIds={roles.filter((role) => user.roles.includes(role.name)).map((role) => role.id)} roles={roles} />
                                <ESignFields action={`user-update-${user.id}`} meaning="Update user roles and status" signerName={signerName} />
                                <SubmitButton className="secondary-button" pendingLabel="Saving…">
                                  Save access
                                </SubmitButton>
                              </form>
                            </details>
                            <details className="user-admin-panel">
                              <summary>Recovery</summary>
                              <form action={updateUserRecoveryAction} className="form-grid">
                                <input name="userId" type="hidden" value={user.id} />
                                <div className="field">
                                  <RequiredLabel htmlFor={`securityQuestion-${user.id}`}>Question</RequiredLabel>
                                  <input id={`securityQuestion-${user.id}`} name="securityQuestion" required />
                                </div>
                                <div className="field">
                                  <RequiredLabel htmlFor={`securityAnswer-${user.id}`}>Answer</RequiredLabel>
                                  <input autoComplete="off" id={`securityAnswer-${user.id}`} name="securityAnswer" required />
                                </div>
                                <label className="check-row">
                                  <input name="passwordResetRequired" type="checkbox" value="yes" />
                                  Force password change
                                </label>
                                <ESignFields action={`user-recovery-${user.id}`} meaning="Update user recovery details" signerName={signerName} />
                                <SubmitButton className="secondary-button" pendingLabel="Updating…">
                                  Update
                                </SubmitButton>
                              </form>
                            </details>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {section === "new-user" ? (
                <div className="settings-card">
                  <h2>New user</h2>
                  <form action={createUserAction} className="form-grid">
                    <div className="two-col">
                      <div className="field">
                        <RequiredLabel htmlFor="userName">Name</RequiredLabel>
                        <input id="userName" name="name" required />
                      </div>
                      <div className="field">
                        <RequiredLabel htmlFor="userEmail">Email</RequiredLabel>
                        <input autoComplete="email" id="userEmail" name="email" required type="email" />
                      </div>
                    </div>
                    <div className="two-col">
                      <div className="field">
                        <RequiredLabel htmlFor="userPassword">Password</RequiredLabel>
                        <input autoComplete="new-password" id="userPassword" minLength={8} name="password" required type="password" />
                      </div>
                      <div className="field">
                        <RequiredLabel htmlFor="isActive">Status</RequiredLabel>
                        <select defaultValue="yes" id="isActive" name="isActive" required>
                          <option value="yes">Active</option>
                          <option value="no">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="two-col">
                      <div className="field">
                        <RequiredLabel htmlFor="securityQuestion">Recovery question</RequiredLabel>
                        <input id="securityQuestion" name="securityQuestion" required />
                      </div>
                      <div className="field">
                        <RequiredLabel htmlFor="securityAnswer">Recovery answer</RequiredLabel>
                        <input autoComplete="off" id="securityAnswer" name="securityAnswer" required />
                      </div>
                    </div>
                    <RoleAssignmentField roles={roles} />
                    <ESignFields action="user-create" meaning="Create user account" signerName={signerName} />
                    <div className="actions">
                      <SubmitButton pendingLabel="Creating…">
                        Create user
                      </SubmitButton>
                    </div>
                  </form>
                </div>
              ) : null}

              {section === "new-role" ? (
                <div className="settings-card">
                  <h2>New role</h2>
                  <form action={createRoleAction} className="form-grid">
                    <div className="field">
                      <RequiredLabel htmlFor="name">Role name</RequiredLabel>
                      <input id="name" name="name" required />
                    </div>
                    <PermissionSelectionField permissions={permissions} />
                    <ESignFields action="role-create" meaning="Create controlled role" signerName={signerName} />
                    <div className="actions">
                      <SubmitButton pendingLabel="Creating…">
                        Create role
                      </SubmitButton>
                    </div>
                  </form>
                </div>
              ) : null}

              {section === "rights" ? <SettingsRoles permissions={permissions} roles={roles} signerName={signerName} /> : null}

              {section === "display" ? (
                <div className="settings-card">
                  <h2>Display</h2>
                  <form action={updateDisplaySettingAction} className="form-grid">
                    <div className="field">
                      <RequiredLabel htmlFor="dateFormat">Date format</RequiredLabel>
                      <select defaultValue={displaySetting.dateFormat} id="dateFormat" name="dateFormat" required>
                        {dateFormatOptions.map((format) => (
                          <option key={format} value={format}>
                            {format}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ESignFields action="display-settings" meaning="Update display settings" signerName={signerName} />
                    <div className="actions">
                      <SubmitButton pendingLabel="Updating…">
                        Update display
                      </SubmitButton>
                    </div>
                  </form>
                </div>
              ) : null}

              {section === "password-policy" ? (
                <div className="settings-card">
                  <h2>Password policy</h2>
                  <form action={updatePasswordPolicyAction} className="form-grid">
                    <div className="field">
                      <RequiredLabel htmlFor="expiryDays">Password expires after days</RequiredLabel>
                      <input defaultValue={passwordPolicy.expiryDays} id="expiryDays" inputMode="numeric" min={0} max={3650} name="expiryDays" required type="number" />
                    </div>
                    <ESignFields action="password-policy" meaning="Update password expiry policy" signerName={signerName} />
                    <div className="actions">
                      <SubmitButton pendingLabel="Updating…">
                        Update policy
                      </SubmitButton>
                    </div>
                  </form>
                </div>
              ) : null}

              {section === "workflows" ? (
                <div className="settings-grid settings-grid-compact">
                  <div className="settings-card">
                    <h2>Workflows</h2>
                    <div className="form-grid">
                      {Object.entries(defaultWorkflows).map(([key, steps]) => (
                        <div className="file-row" key={key}>
                          <GitBranch size={15} />
                          <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                          <span>{steps.length} steps</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="settings-card">
                    <h2>Receipt flow</h2>
                    <div className="form-grid">
                      {defaultWorkflows.receipt.map((step, index) => (
                        <div className="file-row" key={step.key}>
                          {step.terminal ? <Check size={15} /> : index === 0 ? <Circle size={15} /> : <ShieldCheck size={15} />}
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
