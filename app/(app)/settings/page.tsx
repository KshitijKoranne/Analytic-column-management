import { Check, Circle, GitBranch, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { defaultWorkflows } from "@/lib/workflows";
import { rolePermissions } from "@/lib/permissions";
import { permissionHumanLabels, roleLabels } from "@/lib/labels";
import type { RoleKey } from "@/lib/types";

const roles: RoleKey[] = ["admin", "manager", "analyst", "reviewer", "auditor"];

export default function SettingsPage() {
  return (
    <AppShell active="settings" title="Settings">
      <section className="module-shell">
        <div className="module-toolbar">
          <div className="segment">
            <span>Roles</span>
            <span>Workflows</span>
            <span>Locations</span>
            <span>Numbering</span>
          </div>
          <button className="secondary-button">Save</button>
        </div>
        <div className="detail-panel">
          <div className="settings-grid">
            <div className="settings-card">
              <h2>Roles</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role}>
                      <td>{roleLabels[role]}</td>
                      <td>{rolePermissions[role].length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="settings-card">
              <h2>Permissions</h2>
              <div className="form-grid">
                {Object.keys(permissionHumanLabels).slice(0, 8).map((key) => (
                  <label className="check-row" key={key}>
                    <input defaultChecked type="checkbox" />
                    {permissionHumanLabels[key]}
                  </label>
                ))}
              </div>
            </div>
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
                    <span>{permissionHumanLabels[step.requiredPermission]}</span>
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
