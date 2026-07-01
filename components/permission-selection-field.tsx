"use client";

import { useMemo, useState } from "react";
import { permissionGroups, workflowApprovalConflicts } from "@/lib/permissions";
import type { PermissionOption } from "@/lib/data";

export function PermissionSelectionField({ permissions, checked = [] }: { permissions: PermissionOption[]; checked?: string[] }) {
  const [selected, setSelected] = useState(() => new Set(checked));
  const byKey = new Map(permissions.map((permission) => [permission.key, permission]));
  const conflicts = useMemo(() => workflowApprovalConflicts(Array.from(selected)), [selected]);

  function toggle(key: string, isChecked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (isChecked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <div className="permission-groups">
      {permissionGroups.map((group) => {
        const groupPermissions = group.permissions.map((key) => byKey.get(key)).filter((permission): permission is PermissionOption => Boolean(permission));
        if (!groupPermissions.length) return null;

        return (
          <fieldset className="permission-group" key={group.key}>
            <legend>{group.title}</legend>
            <div className="permission-grid">
              {groupPermissions.map((permission) => (
                <label className="check-row" key={permission.key}>
                  <input checked={selected.has(permission.key)} name="permissions" onChange={(event) => toggle(permission.key, event.target.checked)} type="checkbox" value={permission.key} />
                  {permission.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      {conflicts.length ? <SodWarning conflicts={conflicts} /> : null}
    </div>
  );
}

export function SodWarning({ conflicts }: { conflicts: string[] }) {
  return (
    <div className="warning-panel">
      <strong>Creation and approval rights selected</strong>
      <span>{conflicts.join(", ")}</span>
      <label className="check-row">
        <input name="sodAcknowledged" required type="checkbox" value="yes" />
        Acknowledge same-user workflow approval risk
      </label>
    </div>
  );
}
