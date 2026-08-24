// Shell chrome shared by the Refine-driven mock screens — the same identity/org-switcher slots
// each pure page view's own `component.stories.tsx` already builds. Kept here once so the four
// containers don't re-derive it, since it is presentational chrome, not hook-adapted state.

import React from 'react';

import { ConsoleHeader } from '../components/console-header';

const identity = (
  <div className="flex items-center gap-3">
    <span className="hidden font-mono text-[11px] text-subtle md:inline">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);

const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;

export const refineMockHeader = <ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />;
