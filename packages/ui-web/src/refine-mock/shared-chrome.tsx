// Shell chrome shared by the Refine-driven mock screens — the same identity/org-switcher slots
// each pure page view's own `component.stories.tsx` already builds. Kept here once so the four
// containers don't re-derive it, since it is presentational chrome, not hook-adapted state.

import React from 'react';

import { AccountMenu } from '../components/account-menu';
import { ConsoleHeader } from '../components/console-header';

const identity = (
  <AccountMenu name="Sam Lambou" email="sam@adorsys.com" initials="SL" onSignOut={() => {}} />
);

const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;

export const refineMockHeader = <ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />;
