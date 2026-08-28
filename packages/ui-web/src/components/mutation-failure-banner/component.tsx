import React from 'react';

import { cn } from '../../cn';
import type { MutationFailureBannerProps } from './types';

// Contract: converse-frontends#323 — the console-wide default visibility surface for a failed
// refine-driven mutation (delete, decide, revoke, create, ...) that has no bespoke local error
// line of its own. Mounted once, inside `ConsoleShell`'s own sticky chrome stack (its `banner`
// slot, directly under the header) — every route gets it for free without wiring anything
// per-screen.
//
// Deliberately NOT `ErrorLine` (console-ui skill "States" contract): `ErrorLine` pairs its
// `--signal` line with a `Retry` ghost bound to a specific query's own retry callback. A
// console-wide mutation banner has no such callback — it does not know which screen's mutation
// failed or how to retry it — and reusing `ErrorLine` here would blur its contract with
// converse-frontends#325's separate "not built yet" affordance work. This banner borrows only
// the shared visual language (`--signal` mono line, `role="alert"`), not the component.
//
// Explicit-dismiss-only, no auto-timeout: the console has no toast pattern (design constraint,
// not an oversight) and this does not invent one — it follows `SecretReveal`'s own precedent
// ("dismissed only by explicit ×", never by blur or a timer). `chrome` background (not `surface`
// or `primary`) because this sits IN the header's own sticky chrome band, not as a floating
// panel or a large accent fill (orange is reserved, never a large fill — console-ui skill
// "Never do").
export function MutationFailureBanner({
  message,
  onDismiss,
  className,
}: MutationFailureBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        'border-raised bg-chrome flex items-center justify-between gap-3 border-t px-4 py-2 md:px-6',
        className
      )}>
      <span className="text-primary font-mono text-xs">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-subtle hover:text-soft font-mono text-sm transition-colors duration-150 ease-out">
        ×
      </button>
    </div>
  );
}
