import { Select } from '@base-ui/react/select';
import React from 'react';

import { cn } from '../../cn';
import { fieldLabelClassName } from '../field/field-classes';
import type { ScopeSelectProps } from './types';
import { OVERLAY_CLASS } from '../../lib/overlay';
import { Chevron } from '../chevron';

// Contract: docs/design/console-redesign/README.md §4 — account → project cascade unit for rail
// panels: two stacked labelled selects (`Field` control treatment), account change resets
// project. Pure controlled component. ADR 0010 Decision 4 (Base UI Select ×2): kills the native
// `<select>` + `appearance-none` pair — a themeable `surface` popup with keyboard/typeahead
// replaces the unstyleable native one. `items` (not bare children) is what makes `Select.Value`
// render the human label instead of the raw id. `ScopeSelectField` factors the identical
// Root→Popup→Item tree shared by both pickers.
const triggerClassName = cn(
  'flex h-[30px] w-full items-center justify-between gap-2 rounded-[2px] border border-border bg-chrome px-3',
  'font-mono text-sm text-soft outline-hidden data-[popup-open]:border-primary focus-visible:border-primary',
);
const popupClassName = cn('z-50 w-(--anchor-width) py-1 font-mono', OVERLAY_CLASS);
const itemClassName = cn(
  'flex cursor-pointer items-center px-3 py-1.5 text-xs text-soft outline-hidden',
  'data-[highlighted]:bg-raised data-[highlighted]:text-ink',
);

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
      <Select.Label className={fieldLabelClassName}>{label}</Select.Label>
      <Select.Trigger className={triggerClassName}>
        <Select.Value />
        <Select.Icon>
          <Chevron />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className="outline-hidden select-none">
          <Select.Popup className={popupClassName}>
            <Select.List>
              {items.map((item) => (
                <Select.Item key={item.value ?? ''} value={item.value} className={itemClassName}>
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
          ...scopedProjects.map((project) => ({ value: project.id as string | null, label: project.label })),
        ]}
        value={value.projectId}
        onChange={(projectId) => onChange({ accountId: value.accountId, projectId })}
      />
    </div>
  );
}
