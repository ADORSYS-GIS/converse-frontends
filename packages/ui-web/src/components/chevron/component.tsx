import React from 'react';

import { cn } from '../../cn';

/**
 * The console's one disclosure chevron. Was re-drawn inline at 8×8 in five places; at that size
 * it read as a speck rather than an affordance (owner review 2026-08-29 — "icons are too small").
 * 12×12 on a 16px box, matching `Button`'s `size="icon"` glyph track.
 */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn('stroke-subtle size-3 shrink-0', className)}
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}
