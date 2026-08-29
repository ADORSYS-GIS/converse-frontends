import { Select } from '@base-ui/react/select';
import React from 'react';

import { cn } from '../../cn';
import { fieldLabelClassName } from '../field/field-classes';
import { OVERLAY_CLASS, OVERLAY_ITEM_CLASS } from '../../lib/overlay';
import { Chevron } from '../chevron';
import type { SelectFieldProps } from './types';

// Base UI `Select` (ADR 0010 Decision 2). Never a native `<select>` + `appearance-none`: the
// native popup cannot be themed, ignores our tokens entirely, and renders as OS chrome in the
// middle of the console — which is what it was doing until 2026-08-29.
//
// Two layouts: `stacked` for a rail column, `inline` for a toolbar row.
const triggerClassName = cn(
  'flex h-[30px] items-center justify-between gap-2 rounded-[2px] border border-border bg-chrome px-3',
  'font-mono text-sm text-soft outline-hidden data-[popup-open]:border-primary focus-visible:border-primary'
);

export function SelectField({
  label,
  value,
  options,
  onChange,
  layout = 'stacked',
  className,
}: SelectFieldProps) {
  const inline = layout === 'inline';

  return (
    <Select.Root
      items={options}
      value={value}
      onValueChange={(next) => next !== null && onChange(next)}>
      <div className={cn(inline ? 'flex items-center gap-2' : 'flex flex-col gap-1.5', className)}>
        <Select.Label className={cn(fieldLabelClassName, inline && 'shrink-0')}>
          {label}
        </Select.Label>
        {/* `inline` sizes to its widest option; `stacked` fills the rail column. */}
        <Select.Trigger className={cn(triggerClassName, inline ? 'w-auto' : 'w-full')}>
          <Select.Value />
          <Select.Icon>
            <Chevron />
          </Select.Icon>
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className="z-50 outline-hidden select-none">
          <Select.Popup className={cn('min-w-(--anchor-width) py-1 font-mono', OVERLAY_CLASS)}>
            <Select.List>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} className={OVERLAY_ITEM_CLASS}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
