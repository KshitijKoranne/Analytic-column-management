"use client";

import { useMemo, useState } from "react";
import { workflowApprovalConflicts } from "@/lib/permissions";
import { SodWarning } from "@/components/permission-selection-field";
import type { RoleSetting } from "@/lib/data";

export function RoleAssignmentField({ roles }: { roles: RoleSetting[] }) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const conflicts = useMemo(() => {
    const permissions = roles.filter((role) => selectedRoleIds.includes(role.id)).flatMap((role) => role.permissions);
    return workflowApprovalConflicts(permissions);
  }, [roles, selectedRoleIds]);

  function toggle(id: string, checked: boolean) {
    setSelectedRoleIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  return (
    <>
      <div className="role-chip-grid">
        {roles.map((role) => (
          <label className="check-row" key={role.id}>
            <input name="roleIds" onChange={(event) => toggle(role.id, event.target.checked)} type="checkbox" value={role.id} />
            {role.name}
          </label>
        ))}
      </div>
      {conflicts.length ? <SodWarning conflicts={conflicts} /> : null}
    </>
  );
}
