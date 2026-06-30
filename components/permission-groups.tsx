import { permissionGroups } from "@/lib/permissions";
import type { PermissionOption } from "@/lib/data";

export function PermissionGroups({ permissions, checked = [] }: { permissions: PermissionOption[]; checked?: string[] }) {
  const byKey = new Map(permissions.map((permission) => [permission.key, permission]));
  const checkedSet = new Set(checked);

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
                  <input defaultChecked={checkedSet.has(permission.key)} name="permissions" type="checkbox" value={permission.key} />
                  {permission.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
