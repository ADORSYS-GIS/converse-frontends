import React, { useId } from 'react';

import { cn } from '../../cn';
import { fieldControlVariants, fieldLabelClassName } from '../field/cva';
import type { RailSelectProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (forms & actions) — the rail's dropdown.
// A controlled native `<select>` wearing the `Field` control treatment (30px, `chrome` inset,
// `border` stroke, radius 2, focus → `primary`), with the standard 10px uppercase tracked label
// above it and a 8×8 chevron drawn in `subtle` (native appearance suppressed).
export function RailSelect({ label, value, options, onChange, className }: RailSelectProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={fieldLabelClassName}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            fieldControlVariants({ error: false, multiline: false }),
            'appearance-none pr-7'
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
