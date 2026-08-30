import React from 'react';

import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from '../../lib/type-roles';
import type { PageHeaderProps } from './types';

// The console visual revamp's page-level heading (phase 1 foundation brief) — every screen in the
// two-column shell opens with the same title block: a 24px semibold title, a 13px subtitle, and a
// trailing cluster for the screen's own controls and primary action. `page-header` (theme.css)
// carries the wrap/space-between geometry; `PAGE_TITLE_CLASS`/`PAGE_SUBTITLE_CLASS` carry the
// type. Supersedes `ScreenHeading` for screens rebuilt under this revamp (phase 2 removes the
// older component once every screen has moved over).
export function PageHeader({ title, subtitle, controls, action }: PageHeaderProps) {
  const hasTrailing = Boolean(controls || action);
  return (
    <div className="page-header">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
        {subtitle ? <p className={PAGE_SUBTITLE_CLASS}>{subtitle}</p> : null}
      </div>
      {hasTrailing ? (
        <div className="page-header-controls">
          {controls}
          {action}
        </div>
      ) : null}
    </div>
  );
}
