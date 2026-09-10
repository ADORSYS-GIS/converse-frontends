import React from 'react';

import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from '../../lib/type-roles';
import type { PageHeaderProps } from './types';

// The console visual revamp's page-level heading (phase 1 foundation brief) — every screen in the
// two-column shell opens with the same title block: a 24px semibold title, a 13px subtitle, and the
// screen's one primary action on the trailing edge. `page-header` (theme.css) carries the wrap/
// space-between geometry; `PAGE_TITLE_CLASS`/`PAGE_SUBTITLE_CLASS` carry the type.
//
// 2026-09-03 (owner directive "filters are outside cards", ADR 0015 amendment A2): the `controls`
// slot is DELETED, not deprecated. Screen parameters are `PageControls` — a full-width row of their
// own, mounted as this header's next sibling — so nothing shares the title row with the action any
// more. `page-header-controls` became `page-header-action` in `theme.css` for the same reason: the
// cluster holds exactly one thing now, and a plural class name would keep inviting a second.
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
        {subtitle ? <p className={PAGE_SUBTITLE_CLASS}>{subtitle}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  );
}
