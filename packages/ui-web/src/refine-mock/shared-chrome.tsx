// Shell chrome shared by the Refine-driven mock screens.
//
// This is the Storybook analogue of `apps/console`'s persistent `(console)` layout (console-ui
// skill "Composition"): the shell is composed ONCE here, and each container supplies only its
// centre (`children`) and, where it still has one, an `aside` column — the same
// `children`/rail split the App Router performs for real. A container therefore never mounts
// `ConsoleShell`, `ConsoleSidebar`, `ConsoleTopBar` or `NavSpine` itself.
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
  /**
   * The former left/right rail sections — the shell no longer owns a rail slot at all (shell
   * brief 2026-08-30), so a container that still has rail-shaped content renders it as a column
   * beside `children` instead. Omit entirely for a screen with no rail content at any tier (its
   * parameters belong in `PageHeader.controls`/`action` instead — see `RefineOverviewScreen` and
   * `RefineApiKeysScreen`).
   */
  aside?: ReactNode;
  children: ReactNode;
}

export function RefineMockShell({
  active,
  showAdmin = false,
  aside,
  children,
}: RefineMockShellProps) {
  return (
    <ConsoleShell sidebar={storySidebar(active, { isAdmin: showAdmin })} topBar={storyTopBar()}>
      {aside ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
          {/* Persistent only at `lg`, same tier the old right rail persisted at — everything
              below stays reachable exclusively through each section's own `SectionSheetTrigger`/
              `SelectionSheet` (unaffected by this shell rewrite). */}
          <div className="hidden flex-col gap-4 lg:flex lg:w-[280px] lg:flex-none">{aside}</div>
        </div>
      ) : (
        children
      )}
    </ConsoleShell>
  );
}
