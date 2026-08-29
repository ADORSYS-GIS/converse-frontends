import { Select } from '@base-ui/react/select';
import React from 'react';

import { cn } from '../../cn';
import { fieldControlClassName, fieldLabelClassName } from '../field/field-classes';
import type { ScopeSelectProps } from './types';
import {
  OVERLAY_ANCHORED_POPUP_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_POSITIONER_CLASS,
} from '../../lib/overlay';
import { Chevron } from '../chevron';

// Contract: docs/design/console-redesign/README.md §4 — account then project cascade unit for rail
// panels: two stacked labelled selects wearing the shared control treatment, account change resets
// project. Pure controlled component. ADR 0010 Decision 4 (Base UI Select x2): kills the native
// select + an appearance-none override pair — a themeable `surface` popup with keyboard/typeahead replaces
// the unstyleable native one. `items` (not bare children) is what makes `Select.Value` render the
// human label instead of the raw id. `ScopeSelectField` factors the identical Root-to-Popup tree
// shared by both pickers; every class it carries is daisy's or the shared overlay chrome's.
function ScopeSelectField<V extends string | null>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: V; label: string }[];
  value: V;
  /** `V | null`: Base UI's Select always admits a `null` "no selection" value, even where the
   * caller's own items never offer one (Account) — see the two call sites below. */
  onChange: (value: V | null) => void;
}) {
  return (
    <Select.Root items={items} value={value} onValueChange={onChange}>
      {/* daisy's stacked field layout. `Select.Root` renders no element of its own, so without
          this wrapper the label and the trigger were two separate children of the cascade's own
          16px column — a label floating 16px above the control it names. */}
      <div className="fieldset">
        <Select.Label className={fieldLabelClassName}>{label}</Select.Label>
        <Select.Trigger className={fieldControlClassName}>
          <Select.Value />
          <Select.Icon>
            <Chevron />
          </Select.Icon>
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className={OVERLAY_POSITIONER_CLASS}>
          <Select.Popup className={OVERLAY_ANCHORED_POPUP_CLASS}>
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value ?? ''}
                  value={item.value}
                  className={OVERLAY_ITEM_CLASS}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

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
      <ScopeSelectField
        label="Account"
        items={accounts.map((account) => ({ value: account.id, label: account.label }))}
        value={value.accountId}
        onChange={(accountId) => accountId !== null && onChange({ accountId, projectId: null })}
      />
      <ScopeSelectField
        label="Project"
        items={[
          { value: null, label: projectPlaceholder },
          ...scopedProjects.map((project) => ({
            value: project.id as string | null,
            label: project.label,
          })),
        ]}
        value={value.projectId}
        onChange={(projectId) => onChange({ accountId: value.accountId, projectId })}
      />
    </div>
  );
}
