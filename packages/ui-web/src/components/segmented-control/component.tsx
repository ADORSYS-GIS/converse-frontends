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
              // `flex-auto` (`1 1 auto`), NOT `flex-1` (`1 1 0%`): with a zero flex-basis every
              // cell wants zero width and only grows into *leftover* space, so in a
              // content-sized container — a toolbar row, as opposed to the full-width rail this
              // was first written for — the cells collapsed onto each other and the labels
              // overlapped (owner screenshot, 2026-08-29). `auto` starts each cell at its own
              // content width and still shares any remaining space, so it fills the rail exactly
              // as before AND stays readable in a toolbar.
              'relative flex h-[30px] flex-auto items-center justify-center whitespace-nowrap px-3',
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
