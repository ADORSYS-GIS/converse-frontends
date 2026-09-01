import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import React from 'react';

import { cn } from '../../cn';
import type { SegmentedControlProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (forms & actions) — equal-width cells,
// `--line` dividers, active cell = `--raised` fill + 2px `--signal` bottom bar.
//
// ADR 0010 Decision 4 (Base UI Toggle Group): the hand-written roving `tabIndex` and the
// ArrowRight/Left/Up/Down/Home/End switch are deleted — Base UI's internal composite roving focus
// (`loopFocus`, Home/End) drives keyboard navigation instead. This changes one real detail: Base
// UI's Toggle Group is a toolbar-of-toggle-buttons pattern (arrow keys move focus; Enter/Space
// activates), not a radiogroup (where arrow keys both move focus AND select) — the old
// radiogroup/radio role pair went with the hand-rolled switch it depended on. `multiple={false}`
// still guarantees at most one cell is pressed, but Toggle Group has no built-in "always exactly
// one selected" mode — clicking the already-active cell would otherwise toggle it OFF to an empty
// selection, so `onValueChange` only forwards a genuine change and otherwise lets the controlled
// `value` prop snap the group back to the current selection.
//
// The paint is the daisy one-of-N vocabulary: `tabs` is the strip, `tab` the cell, `tab-active` the
// chosen one. The console's corrections to it (30px cells, a shared `--line` hairline between
// them, `chrome`/`subtle` at rest, `raised`/`ink` when chosen, and the 2px signal bar as a
// pseudo-element rather than a rendered span) live once in `theme.css`, alongside the note on why
// `sub-nav` deliberately did NOT take the same classes.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => {
        const nextValue = next[0] as T | undefined;
        if (nextValue !== undefined && nextValue !== value) {
          onChange(nextValue);
        }
      }}
      aria-label={rest['aria-label']}
      className={cn('tabs', className)}>
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className={cn('tab', option.value === value && 'tab-active')}>
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
