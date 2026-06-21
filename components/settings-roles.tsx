"use client";

import { useMemo, useState } from "react";
import { updateRolePermissionsAction } from "@/app/actions";
import { ESignFields } from "@/components/e-sign-fields";
import type { PermissionOption, RoleSetting } from "@/lib/data";

export function SettingsRoles({ roles, permissions, signerName }: { roles: RoleSetting[]; permissions: PermissionOption[]; signerName?: string | null }) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole = useMemo(() => roles.find((role) => role.id === selectedRoleId) ?? roles[0], [roles, selectedRoleId]);

  if (!selectedRole) return null;

  return (
    <div className="settings-card settings-card-wide">
      <div className="panel-head settings-panel-head">
        <div className="field role-select-field">
          <label htmlFor="roleSelector">Role</label>
          <select id="roleSelector" value={selectedRole.id} onChange={(event) => setSelectedRoleId(event.target.value)}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <form action={updateRolePermissionsAction} className="form-grid" key={selectedRole.id}>
        <input name="roleId" type="hidden" value={selectedRole.id} />
        <div className="permission-grid">
          {permissions.map((permission) => (
            <label className="check-row" key={`${selectedRole.id}-${permission.key}`}>
              <input defaultChecked={selectedRole.permissions.includes(permission.key)} name="permissions" type="checkbox" value={permission.key} />
              {permission.label}
            </label>
          ))}
        </div>
        <ESignFields action={`role-rights-${selectedRole.id}`} meaning="Change role rights" signerName={signerName} />
        <div className="actions">
          <button className="primary-button" type="submit">
            Save rights
          </button>
        </div>
      </form>
    </div>
  );
}
