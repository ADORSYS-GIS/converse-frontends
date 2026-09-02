// Component-level regression test for the console's route-transition loading states.
//
// `apps/console`'s `(console)` route group previously had no `loading.tsx` anywhere: every centre
// segment carries `export const dynamic = 'force-dynamic'`, so a client-side navigation between
// routes re-rendered `children`/`@rail`/`@scope` server-side with nothing to show until the RSC
// payload landed — an empty floor (pure `bg-muted` black in the default theme). Each route now has
// a `loading.tsx` that mirrors this exact page-story's `Loading` composition 1:1 (same sections,
// same `loading`/`status="loading"` props) — see `apps/console/src/app/(console)/*/loading.tsx`.
//
// `apps/console` cannot be exercised without a logged-in session (Keycloak-gated middleware), so
// this is the automated proof that the skeleton composition each `loading.tsx` reuses actually
// renders real skeleton geometry — `raised` blocks, never a blank floor — rather than only being
// checked by eye in Storybook. Run: `pnpm --filter @lightbridge/ui-web test -- loading-skeletons`.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Loading as AdminLoading } from './admin-budget-review.stories';
import { Loading as ApiKeysLoading } from './api-keys.stories';
import { Loading as ProjectsLoading } from './settings-accounts-projects.stories';
import { Loading as OverviewLoading } from './overview.stories';

/** Every `role="presentation" aria-hidden="true"` skeleton block the console-ui skill's §states
 * contract requires ("skeleton blocks (`raised`) matching final geometry ... no spinner"). */
function skeletonBlocks(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll('[role="presentation"][aria-hidden="true"]');
}

describe("console route Loading page-stories (the source `apps/console`'s loading.tsx files reuse)", () => {
  it('Overview: renders skeleton blocks and the real title, never a blank floor', () => {
    const { container } = render(<>{OverviewLoading.render!({}, {} as never)}</>);

    expect(skeletonBlocks(container).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    // BUDGET is the one zone this fallback names, and the only one it honestly CAN: the panels
    // below it come from `dashboards.yaml`, which the server component reads after this boundary
    // has already rendered, so their titles are not knowable here (converse-frontends#455, story
    // C12 — the fallback draws the page's shape, not a guess at its labels). The zone keeps its
    // heading row while loading; only the numeral is a skeleton.
    expect(screen.getByText('Budget')).toBeInTheDocument();
    // …and the grid below it is real skeleton geometry, not a blank floor.
    expect(skeletonBlocks(container).length).toBeGreaterThan(4);
  });

  it('Api-Keys: renders ledger row skeletons and the real title', () => {
    const { container } = render(<>{ApiKeysLoading.render!({}, {} as never)}</>);

    expect(skeletonBlocks(container).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'API keys' })).toBeInTheDocument();
  });

  it('Projects: renders ledger row skeletons and the real title', () => {
    const { container } = render(<>{ProjectsLoading.render!({}, {} as never)}</>);

    expect(skeletonBlocks(container).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('Admin: renders review-queue row skeletons and the real title', () => {
    const { container } = render(<>{AdminLoading.render!({}, {} as never)}</>);

    expect(skeletonBlocks(container).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Budget refill review' })).toBeInTheDocument();
  });
});
