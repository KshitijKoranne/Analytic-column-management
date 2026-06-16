"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteRoleAction, updateRolePermissionsAction } from "@/app/actions";
import type { PermissionOption, RoleSetting } from "@/lib/data";

export function SettingsRoles({ roles, permissions }: { roles: RoleSetting[]; permissions: PermissionOption[] }) {
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
        {!selectedRole.isSystem ? (
          <form action={deleteRoleAction}>
            <input name="roleId" type="hidden" value={selectedRole.id} />
            <button className="secondary-button" type="submit">
              <Trash2 size={14} />
              Delete
            </button>
          </form>
        ) : null}
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
        <div className="actions">
          <button className="primary-button" type="submit">
            Save rights
          </button>
        </div>
      </form>
    </div>
  );
}
