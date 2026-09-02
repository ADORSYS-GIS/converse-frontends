import { cn } from '../../cn';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { BODY_CLASS } from '../../lib/type-roles';
import type { InlineStatusProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — a single mono line above
// the content: "23 active · 4 revoked · 1 expires in 6 days". This is the empty-state primitive
// too: the table header / chart axes it sits above must stay rendered by the consumer.
//
// NO UPSTREAM: daisy `alert` is explicitly rejected in PRIMITIVES.md — it is a bordered, iconed,
// rounded box, and an empty state here is a line, not a box. What that leaves is two imports and
// zero locally-declared classes: the geometry is the shared inline-row (lib/inline-row.ts,
// which `ErrorLine` and `BudgetHero`'s footer render into as well) and the type is the shared
// `row` role. There is nothing left in this component that is only about this component.
export function InlineStatus({ children, action, className }: InlineStatusProps) {
  return (
    <div role="status" aria-live="polite" className={cn(INLINE_ROW_CLASS, BODY_CLASS, className)}>
      <span>{children}</span>
      {action}
    </div>
  );
}
