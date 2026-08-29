import { Meter as BaseMeter } from '@base-ui/react/meter';
import React from 'react';

import { cn } from '../../cn';
import { formatUsdOf } from '../../lib/money';
import type { MeterProps } from './types';

const DEFAULT_THRESHOLD = 0.9;

// Contract: docs/design/console-redesign/README.md §4 (data display) / §2.4 — 4px `--raised`
// track + fill; `--body` under threshold, `--signal` at or past it; always paired with the
// "$X of $Y" mono caption.
//
// PRIMITIVE-MATRIX row 20: this was the package's one HAND-ROLLED component — a plain `<div>`
// carrying a hand-written `role="meter"` plus `aria-label`/`-valuenow`/`-valuemin`/`-valuemax`.
// Base UI ships `meter` and now owns every one of those: `Meter.Root` emits the role, derives
// `aria-valuenow` from `value`/`min`/`max` (clamping it, which the hand-written version did not —
// it advertised `aria-valuenow="600"` against `aria-valuemax="500"` while the fill was pinned at
// 100%), `Meter.Label` supplies the accessible name through `aria-labelledby`, and
// `Meter.Indicator` computes the fill width. The a11y contract here carries the budget-breach
// signal, so it is the one place a hand-rolled approximation was least affordable.
//
// daisy `progress`/`radial-progress` stay REJECTED (PRIMITIVES.md § "not adopted"): both are
// rounded and animated. The visual below is unchanged — a 4px square track, `raised`/`soft`,
// `primary` only past the threshold.
export function Meter({
  value,
  ceiling,
  threshold = DEFAULT_THRESHOLD,
  showCaption = true,
  label = 'Consumption',
  className,
}: MeterProps) {
  const ratio = ceiling > 0 ? value / ceiling : 0;
  const breached = ratio >= threshold;
  // One string, three jobs: the visible caption, `aria-valuetext`, and (via `Meter.Value`'s own
  // `aria-hidden`) the guarantee that a screen reader hears it exactly once. Base UI's default
  // `aria-valuetext` is a bare percentage, which loses the currency the breach is judged in.
  const caption = formatUsdOf(value, ceiling);

  return (
    <BaseMeter.Root
      value={value}
      min={0}
      max={ceiling}
      getAriaValueText={() => caption}
      className={cn('flex flex-col gap-2', className)}>
      {/* The meter's name is never drawn — the surrounding panel already titles it (BudgetHero,
          ReviewDetailPanel, BudgetPanel). `Meter.Label` keeps it a real, referenced element
          rather than an `aria-label` string. */}
      <BaseMeter.Label className="sr-only">{label}</BaseMeter.Label>
      <BaseMeter.Track className="bg-raised h-1 w-full rounded-[2px]">
        <BaseMeter.Indicator className={cn('rounded-[2px]', breached ? 'bg-primary' : 'bg-soft')} />
      </BaseMeter.Track>
      {showCaption ? (
        <BaseMeter.Value className="text-soft font-mono text-xs" render={<p />}>
          {() => caption}
        </BaseMeter.Value>
      ) : null}
    </BaseMeter.Root>
  );
}
