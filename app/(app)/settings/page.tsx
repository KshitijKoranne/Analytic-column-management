import Link from "next/link";
import { Check, Circle, GitBranch, KeyRound, ShieldCheck, ShieldPlus, UserPlus, Users } from "lucide-react";
import { createRoleAction, createUserAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { ESignFields } from "@/components/e-sign-fields";
import { RequiredLabel } from "@/components/required-label";
import { SettingsRoles } from "@/components/settings-roles";
import { requirePermission } from "@/lib/access";
import { getRoleSettings, getUserSettings } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { defaultWorkflows } from "@/lib/workflows";

export const dynamic = "force-dynamic";

type SettingsSection = "users" | "new-user" | "new-role" | "rights" | "workflows";

const settingsSections: Array<{
  key: SettingsSection;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { key: "users", label: "Users", href: "/settings", icon: Users },
  { key: "new-user", label: "New user", href: "/settings?section=new-user", icon: UserPlus },
  { key: "new-role", label: "New role", href: "/settings?section=new-role", icon: ShieldPlus },
  { key: "rights", label: "Role rights", href: "/settings?section=rights", icon: KeyRound },
  { key: "workflows", label: "Workflows", href: "/settings?section=workflows", icon: GitBranch }
];

function activeSection(value?: string | string[]): SettingsSection {
  return value === "new-user" || value === "new-role" || value === "rights" || value === "workflows" ? value : "users";
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePermission("settings:read");
  const params = await searchParams;
  const [{ roles, permissions }, users] = await Promise.all([getRoleSettings(), getUserSettings()]);
  const notice = await transactionNotice(params);
  const section = activeSection(params?.section);
  const signerName = access.name ?? access.email;

  return (
    <AppShell active="settings" title="Settings">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="settings-title-row">
            <span>{settingsSections.find((item) => item.key === section)?.label ?? "Users"}</span>
          </div>
        </div>
        {notice ? <div className="module-notice">{notice}</div> : null}
        <div className="detail-panel">
          <div className="settings-layout">
            <nav className="settings-menu" aria-label="Settings sections">
              {settingsSections.map((item) => {
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
                        </div>
                        <div className="user-role-stack">
                          <span>{user.isActive ? "Active" : "Inactive"}</span>
                          <small>{user.roles.join(", ") || "No role"}</small>
                        </div>
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
                    <div className="role-chip-grid">
                      {roles.map((role) => (
                        <label className="check-row" key={role.id}>
                          <input name="roleIds" type="checkbox" value={role.id} />
                          {role.name}
                        </label>
                      ))}
                    </div>
                    <ESignFields action="user-create" meaning="Create user account" signerName={signerName} />
                    <div className="actions">
                      <button className="primary-button" type="submit">
                        Create user
                      </button>
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
                    <div className="permission-grid">
                      {permissions.map((permission) => (
                        <label className="check-row" key={permission.key}>
                          <input name="permissions" type="checkbox" value={permission.key} />
                          {permission.label}
                        </label>
                      ))}
                    </div>
                    <ESignFields action="role-create" meaning="Create controlled role" signerName={signerName} />
                    <div className="actions">
                      <button className="primary-button" type="submit">
                        Create role
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {section === "rights" ? <SettingsRoles permissions={permissions} roles={roles} signerName={signerName} /> : null}

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
