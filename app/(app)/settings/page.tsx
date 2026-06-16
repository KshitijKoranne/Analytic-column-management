import { Check, Circle, GitBranch, ShieldCheck } from "lucide-react";
import { createRoleAction, updateRolePermissionsAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { getRoleSettings } from "@/lib/data";
import { defaultWorkflows } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { roles, permissions } = await getRoleSettings();

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
        <div className="detail-panel">
          <div className="settings-grid">
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

            {roles.map((role) => (
              <div className="settings-card" key={role.id}>
                <form action={updateRolePermissionsAction} className="form-grid">
                  <input name="roleId" type="hidden" value={role.id} />
                  <div className="panel-head settings-panel-head">
                    <div>
                      <h2>{role.name}</h2>
                      <div className="record-subtitle">{role.isSystem ? "System role" : "Custom role"}</div>
                    </div>
                    <button className="secondary-button" type="submit">
                      Save rights
                    </button>
                  </div>
                  <div className="permission-grid">
                    {permissions.map((permission) => (
                      <label className="check-row" key={`${role.id}-${permission.key}`}>
                        <input
                          defaultChecked={role.permissions.includes(permission.key)}
                          name="permissions"
                          type="checkbox"
                          value={permission.key}
                        />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                </form>
              </div>
            ))}

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
