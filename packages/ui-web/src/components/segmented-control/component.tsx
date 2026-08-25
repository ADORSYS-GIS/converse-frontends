import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import React from 'react';

import { cn } from '../../cn';
import type { SegmentedControlProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (forms & actions) — equal-width cells,
// `--line` dividers, active cell = `--raised` fill + 2px `--signal` bottom bar.
//
// ADR 0010 Decision 4 (Base UI Toggle Group): the hand-written roving `tabIndex` and the
// ArrowRight/Left/Up/Down/Home/End switch are deleted — Base UI's internal composite roving
// focus (`loopFocus`, Home/End) drives keyboard navigation instead. This changes one real detail:
// Base UI's Toggle Group is a toolbar-of-toggle-buttons pattern (arrow keys move focus; Enter/
// Space activates), not a radiogroup (where arrow keys both move focus AND select) — the old
// `role="radiogroup"`/`role="radio"` pair goes with the hand-rolled switch it depended on.
// `multiple={false}` still guarantees at most one cell is pressed, but Toggle Group has no
// built-in "always exactly one selected" mode — clicking the already-active cell would otherwise
// toggle it OFF to an empty selection, so `onValueChange` only forwards a genuine change and
// otherwise lets the controlled `value` prop snap the group back to the current selection.
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
      className={cn('flex overflow-hidden rounded-[2px] border border-border', className)}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <Toggle
            key={option.value}
            value={option.value}
            className={cn(
              'relative flex h-[30px] flex-1 items-center justify-center whitespace-nowrap',
              'font-mono text-xs transition-colors duration-150 ease-out',
              'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset',
              active ? 'bg-raised text-ink' : 'bg-chrome text-subtle hover:text-soft',
              index > 0 && 'border-l border-border',
            )}
          >
            {option.label}
            {active ? (
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />
            ) : null}
          </Toggle>
        );
      })}
    </ToggleGroup>
  );
}
