import React from 'react';

import { cn } from '../../cn';
import { ROW_SIGNAL_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { MutationFailureBannerProps } from './types';

// Contract: converse-frontends#323 — the console-wide default visibility surface for a failed
// refine-driven mutation (delete, decide, revoke, create, ...) that has no bespoke local error
// line of its own. Mounted once, inside `ConsoleShell`'s own sticky chrome stack (its `banner`
// slot, directly under the header) — every route gets it for free without wiring anything
// per-screen.
//
// NO UPSTREAM for the band: daisy `alert` is explicitly rejected in PRIMITIVES.md (bordered,
// iconed, rounded), and this is a full-bleed chrome band, not a box. The dismiss control IS daisy
// now — it comes through `Button` as `btn btn-ghost`, the same affordance `SecretReveal`'s × uses,
// rather than a seventh hand-written hover/transition string. The message itself is the shared
// `row` role in the signal colour.
//
// Deliberately NOT `ErrorLine` (console-ui skill "States" contract): `ErrorLine` pairs its
// `--signal` line with a `Retry` ghost bound to a specific query's own retry callback. A
// console-wide mutation banner has no such callback — it does not know which screen's mutation
// failed or how to retry it — and reusing `ErrorLine` here would blur its contract with
// converse-frontends#325's separate "not built yet" affordance work. This banner borrows only
// the shared visual language, not the component.
//
// Explicit-dismiss-only, no auto-timeout: the console has no toast pattern (design constraint,
// not an oversight) and this does not invent one — it follows `SecretReveal`'s own precedent
// ("dismissed only by explicit ×", never by blur or a timer).
export function MutationFailureBanner({
  message,
  onDismiss,
  className,
}: MutationFailureBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      // `chrome`, not `surface` and never a `primary` fill: this sits IN the header's own sticky
      // chrome band rather than floating as a panel, and orange is never a large fill. The
      // hairline above it is `raised` — the same rule that separates any two chrome sections —
      // and the gutters match the centre column's at both tiers so the message lines up with the
      // content it is about.
      className={cn(
        'border-raised bg-chrome flex items-center justify-between gap-3 border-t px-4 py-2 md:px-6',
        className
      )}>
      <span className={ROW_SIGNAL_CLASS}>{message}</span>
      <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss">
        ×
      </Button>
    </div>
  );
}
