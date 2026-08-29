import React, { useId } from 'react';

import { cn } from '../../cn';
import { fieldControlClassName, fieldLabelClassName } from '../field/field-classes';
import type { SelectFieldProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (forms & actions) — a controlled native
// `<select>` wearing the `Field` control treatment (30px, `chrome` inset, `border` stroke, radius
// 2, focus → `primary`), with the shared `label` type role and an 8×8 chevron drawn in `subtle`
// (native appearance suppressed).
//
// Two layouts, one control (owner review 2026-08-29). `stacked` is the rail's shape: label over a
// full-width control, because a 280px column has width to spare and no other way to use it.
// `inline` is the toolbar's: label beside a control that is only as wide as its own longest
// option, because a toolbar's budget is horizontal and stacking six of these would waste most of
// the row on empty label gutters. Same element, same treatment, same props — only the axis moves.
export function SelectField({
  label,
  value,
  options,
  onChange,
  layout = 'stacked',
  className,
}: SelectFieldProps) {
  const id = useId();
  const inline = layout === 'inline';

  return (
    <div
      className={cn(
        inline ? 'flex items-center gap-2' : 'flex flex-col gap-1.5',
        className,
      )}>
      <label htmlFor={id} className={cn(fieldLabelClassName, inline && 'shrink-0')}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            fieldControlClassName,
            'appearance-none pr-7',
            // `w-auto` lets the native select size to its widest option instead of filling the
            // toolbar; `fieldControlClassName`'s own `w-full` is what the rail wants.
            inline && 'w-auto',
          )}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 8 8"
          className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 stroke-subtle"
          fill="none"
          strokeWidth="1.4">
          <path d="M1 3l3 3 3-3" />
        </svg>
      </div>
    </div>
  );
}
