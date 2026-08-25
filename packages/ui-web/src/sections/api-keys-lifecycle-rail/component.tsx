import React from 'react';

import { cn } from '../../cn';
import type { ApiKeysLifecycleRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const API_KEYS_LIFECYCLE_RAIL_LABEL = 'LIFECYCLE';

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) — the right rail's
// LIFECYCLE section: the one piece of standing help copy on the screen, explaining why Revoke and
// Delete are different actions. Inter prose (sentence copy, never structural type). Static by
// design, which is why it lives in the library rather than being retyped at each consumer.
export function ApiKeysLifecycleRail({ className }: ApiKeysLifecycleRailProps) {
  return (
    <p className={cn('font-sans text-[10px] leading-[1.45] text-subtle', className)}>
      Revoke disables a key and keeps its history. Delete removes the record and its audit trail —
      admin only, behind typed confirmation.
    </p>
  );
}
