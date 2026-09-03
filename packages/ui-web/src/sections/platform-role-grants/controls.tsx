import React from 'react';

import { SelectField } from '../../components/select-field';
import { Toggle } from '../../components/toggle';
import { ALL_ROLES } from './component';

export interface PlatformRoleGrantsControlsProps {
  /** `''` ({@link ALL_ROLES}) means "every role" — the filter's own all-values sentinel, never a
   *  real role. */
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  /** The deployment's platform-role catalogue, in the order the console states it. */
  roles: readonly string[];
  /** Off = active grants only, the "who can do what right now" view. On = the audit view. */
  includeRevoked: boolean;
  onIncludeRevokedChange: (includeRevoked: boolean) => void;
}

/**
 * `/admin/roles`' filters — the two knobs `listPlatformRoleGrants` actually supports, and nothing
 * invented beside them.
 *
 * Split out of `PlatformRoleGrants` on 2026-09-03 (owner directive "filters are outside cards",
 * ADR 0015 amendment A2): they used to be a toolbar row inside the same `Card` as the table they
 * filtered. A FRAGMENT, like every other control cluster — the container drops it into one
 * `PageControls` group, and the row owns the geometry, the hairline and the group's name.
 *
 * Both keep their visible labels, unlike most clusters in this row. `hideLabel` is for a control
 * whose own chosen value says what it is; neither of these has that. "All roles" does not say
 * ROLE, and a bare switch says nothing at all — which is exactly the case `SelectFieldProps`'
 * `hideLabel` doc excludes.
 */
export function PlatformRoleGrantsControls({
  roleFilter,
  onRoleFilterChange,
  roles,
  includeRevoked,
  onIncludeRevokedChange,
}: PlatformRoleGrantsControlsProps) {
  return (
    <>
      <SelectField
        label="Role"
        layout="inline"
        value={roleFilter}
        options={[
          { value: ALL_ROLES, label: 'All roles' },
          ...roles.map((role) => ({ value: role, label: role })),
        ]}
        onChange={onRoleFilterChange}
      />
      <Toggle
        label="Include revoked"
        checked={includeRevoked}
        onCheckedChange={onIncludeRevokedChange}
      />
    </>
  );
}
