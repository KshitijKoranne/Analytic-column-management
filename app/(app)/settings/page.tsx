import { Check, Circle, GitBranch, ShieldCheck } from "lucide-react";
import { createRoleAction, createUserAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { SettingsRoles } from "@/components/settings-roles";
import { requirePermission } from "@/lib/access";
import { getRoleSettings, getUserSettings } from "@/lib/data";
import { transactionNotice } from "@/lib/notices";
import { defaultWorkflows } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("settings:read");
  const [{ roles, permissions }, users] = await Promise.all([getRoleSettings(), getUserSettings()]);
  const notice = await transactionNotice(searchParams);

  return (
    <AppShell active="settings" title="Settings">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="segment">
            <span>Roles</span>
            <span>Rights</span>
            <span>Workflows</span>
            <span>Numbering</span>
          </div>
        </div>
        {notice ? <div className="module-notice">{notice}</div> : null}
        <div className="detail-panel">
          <div className="settings-grid">
            <div className="settings-card settings-card-wide">
              <h2>New user</h2>
              <form action={createUserAction} className="form-grid">
                <div className="two-col">
                  <div className="field">
                    <label htmlFor="userName">Name</label>
                    <input id="userName" name="name" />
                  </div>
                  <div className="field">
                    <label htmlFor="userEmail">Email</label>
                    <input autoComplete="email" id="userEmail" name="email" type="email" />
                  </div>
                </div>
                <div className="two-col">
                  <div className="field">
                    <label htmlFor="userPassword">Password</label>
                    <input autoComplete="new-password" id="userPassword" name="password" type="password" />
                  </div>
                  <div className="field">
                    <label htmlFor="isActive">Status</label>
                    <select defaultValue="yes" id="isActive" name="isActive">
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
                <div className="actions">
                  <button className="primary-button" type="submit">
                    Create user
                  </button>
                </div>
              </form>
            </div>

            <div className="settings-card settings-card-wide">
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

            <div className="settings-card settings-card-wide">
              <h2>New role</h2>
              <form action={createRoleAction} className="form-grid">
                <div className="field">
                  <label htmlFor="name">Role name</label>
                  <input id="name" name="name" />
                </div>
                <div className="permission-grid">
                  {permissions.map((permission) => (
                    <label className="check-row" key={permission.key}>
                      <input name="permissions" type="checkbox" value={permission.key} />
                      {permission.label}
                    </label>
                  ))}
                </div>
                <div className="actions">
                  <button className="primary-button" type="submit">
                    Create role
                  </button>
                </div>
              </form>
            </div>

            <SettingsRoles permissions={permissions} roles={roles} />

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
        </div>
      </section>
    </AppShell>
  );
}
