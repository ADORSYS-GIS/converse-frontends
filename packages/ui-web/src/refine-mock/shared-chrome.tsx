// Shell chrome shared by the Refine-driven mock screens.
//
// This is the Storybook analogue of `apps/console`'s persistent `(console)` layout (console-ui
// skill "Composition"): the shell is composed ONCE here, and each container supplies only its
// centre (`children`) — the same thing the App Router's own persistent layout gives `apps/console`
// for real. A container therefore never mounts `ConsoleShell`, `ConsoleSidebar`, `ConsoleTopBar`
// or `NavSpine` itself.
//
// Shell revamp phase 3 (right rail out): the `aside` column this component used to place beside
// `children` for Manage/Admin's former right-rail sections is gone along with the rail concept
// itself — every screen's parameters live in `PageHeader.controls`/`action` now, and
// selection-driven detail opens as a `DetailSheet` (see `refine-manage-screen.tsx`,
// `refine-admin-budget-review-screen.tsx`), so no container has rail-shaped content left to pass.
//
// The brand/switcher/nav fixtures come from `../pages-stories/shell-fixtures` so the fixture-driven
// page stories and these hook-driven ones show the identical chrome. Both files are Storybook-only
// and neither is exported from `src/index.ts`.

import React from 'react';
import type { ReactNode } from 'react';

import { ConsoleShell } from '../components/console-shell';
import { storySidebar, storyTopBar, type StoryRoute } from '../pages-stories/shell-fixtures';

export interface RefineMockShellProps {
  active: StoryRoute;
  showAdmin?: boolean;
  children: ReactNode;
}

export function RefineMockShell({ active, showAdmin = false, children }: RefineMockShellProps) {
  return (
    <ConsoleShell sidebar={storySidebar(active, { isAdmin: showAdmin })} topBar={storyTopBar()}>
      {children}
    </ConsoleShell>
  );
}
