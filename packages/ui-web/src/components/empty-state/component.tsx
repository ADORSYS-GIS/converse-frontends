import React from 'react';

import { META_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import type { EmptyStateProps } from './types';

// The console visual revamp's empty-state primitive (phase 1 foundation brief) — a centred column
// inside a `Card` (or standing alone on the floor), capped to a comfortable reading measure by
// `empty-state` (theme.css). A static composition of two type roles and a slot; nothing here is
// Base UI's to own.
export function EmptyState({ headline, explainer, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className={SECTION_TITLE_CLASS}>{headline}</p>
      {explainer ? <p className={META_CLASS}>{explainer}</p> : null}
      {action}
    </div>
  );
}
