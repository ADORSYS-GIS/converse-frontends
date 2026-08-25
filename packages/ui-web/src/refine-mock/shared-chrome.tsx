// Shell chrome shared by the Refine-driven mock screens.
//
// This is the Storybook analogue of `apps/console`'s persistent `(console)` layout (console-ui
// skill "Composition"): the shell is composed ONCE here, and each container supplies only its
// centre (`children`) and its right-rail sections (`rail`) — the same `children` / `@rail` split
// the App Router performs for real. A container therefore never mounts `ConsoleShell`,
// `ConsoleHeader` or `NavSpine` itself.
//
// The nav/header fixtures come from `../pages-stories/shell-fixtures` so the fixture-driven page
// stories and these hook-driven ones show the identical chrome. Both files are Storybook-only and
// neither is exported from `src/index.ts`.

import React from 'react';
import type { ReactNode } from 'react';

import { ConsoleShell } from '../components/console-shell';
import {
  storyAdminNavItems,
  storyHeader,
  storyNavItems,
  type StoryRoute,
} from '../pages-stories/shell-fixtures';

export interface RefineMockShellProps {
  active: StoryRoute;
  showAdmin?: boolean;
  leftSecondary?: ReactNode;
  leftSecondaryLabel?: string;
  /** Right-rail sections — the `@rail` slot's analogue. */
  rail?: ReactNode;
  children: ReactNode;
}

export function RefineMockShell({
  active,
  showAdmin = false,
  leftSecondary,
  leftSecondaryLabel,
  rail,
  children,
}: RefineMockShellProps) {
  return (
    <ConsoleShell
      header={storyHeader}
      nav={{ items: storyNavItems(active), adminItems: storyAdminNavItems(active), showAdmin }}
      leftSecondary={leftSecondary}
      leftSecondaryLabel={leftSecondaryLabel}
      rightRail={rail}>
      {children}
    </ConsoleShell>
  );
}
