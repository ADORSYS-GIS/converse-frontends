import React from 'react';

import { cn } from '../../cn';
import { SelectField } from '../select-field';
import type { ScopeSelectProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — account then project cascade unit for
// toolbar/rail panels: two stacked labelled selects wearing the shared control treatment, account
// change resets project. Pure controlled component.
//
// unify-select (issue #368): this used to carry its OWN `Select.Root`-to-`Select.Popup` tree
// (`ScopeSelectField`, a near-byte-identical copy of what is now `SelectField`'s implementation)
// because the Project half's value is `string | null` ("All projects" has no real id to be) and
// `SelectField`'s own `value`/`onChange` were typed as plain `string`. That is a translation this
// component can do at its own boundary — `null` maps to `''` going in, and back out again on the
// way to the caller — rather than a reason to keep a second Select implementation: the popup rows
// this used to render sat at the plain ~28px `OVERLAY_ITEM_CLASS` rhythm instead of `SelectField`'s
// palette-matching 36px `select-field-item` rows, which is exactly the kind of "same control, two
// heights" inconsistency the unification fixes just by deleting the duplicate. `SelectField` is
// the ONE Select primitive in the console now; what survives here is only the cascade itself —
// filtering `projects` down to the selected account, and resetting `projectId` on an account
// change — composition `SelectField` has no reason to know about.
export function ScopeSelect({
  accounts,
  projects,
  value,
  onChange,
  projectPlaceholder = 'All projects',
  className,
}: ScopeSelectProps) {
  const scopedProjects = projects.filter((project) => project.accountId === value.accountId);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <SelectField
        label="Account"
        value={value.accountId}
        options={accounts.map((account) => ({ value: account.id, label: account.label }))}
        onChange={(accountId) => onChange({ accountId, projectId: null })}
      />
      <SelectField
        label="Project"
        value={value.projectId ?? ''}
        options={[
          { value: '', label: projectPlaceholder },
          ...scopedProjects.map((project) => ({ value: project.id, label: project.label })),
        ]}
        onChange={(projectId) =>
          onChange({ accountId: value.accountId, projectId: projectId === '' ? null : projectId })
        }
      />
    </div>
  );
}
