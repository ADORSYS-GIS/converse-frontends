// The acceptance surface for the whole point of this refactor: **navigating between screens must
// not remount the chrome**.
//
// Before, every route imported a monolithic `*Page` that mounted its own
// ConsoleShell/ConsoleSidebar/NavSpine, so a route change rebuilt the entire shell. Now the shell
// is mounted once — by `apps/console/src/app/(console)/layout.tsx` for real, and by this story's
// single `<ConsoleShell>` here — and only the centre (`children`) swaps.
//
// This story reproduces that structure with two "routes" swapped by a nav click, and its `play`
// function performs exactly the check the PR is judged on: stash a reference to the live nav DOM
// node before navigating, navigate, then assert the node is the SAME object (`===`), not a
// re-created one. A remounting shell fails it; a persistent one passes.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { ConsoleTopBar } from '../components/console-top-bar';
import { ConsoleSidebar } from '../sections/console-sidebar';
import { ApiKeysLedger } from '../sections/api-keys-ledger';
import { apiKeysFixture } from '../sections/api-keys-ledger/fixtures';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import { overviewStatCards } from '../sections/overview-stat-row/fixtures';

import { PageHeader } from '../sections/page-header';
import {
  storyBrand,
  storyNavGroups,
  storyTopBarWorkspaceSwitcher,
  storyWorkspaceSwitcher,
  type StoryRoute,
} from './shell-fixtures';

/**
 * One shell, two routes. `route` stands in for the App Router's pathname: changing it swaps the
 * centre and the rail, exactly as `children` and the `@rail` slot swap for real — and, exactly as
 * for real, the shell itself is never re-created.
 *
 * The pair is deliberately Overview ↔ Projects rather than Overview ↔ Api-Keys (owner review
 * 2026-08-29): Overview now has NO right rail and Projects does, so navigating between them
 * mounts and unmounts the entire rail column. That is a strictly harder case for shell
 * persistence than swapping one rail's contents for another's, and it is the case the console
 * actually performs now.
 */
function PersistentShell() {
  const [route, setRoute] = useState<StoryRoute>('overview');

  const navigate = (key: string) => {
    if (key === 'overview' || key === 'projects') setRoute(key);
  };

  // Storybook has no router, so the nav items act as buttons here. In `apps/console` these carry
  // `href`s and Next's client-side navigation does the same swap.
  const groups = storyNavGroups(route, false).map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, href: undefined, onSelect: navigate })),
  }));

  return (
    <ConsoleShell
      sidebar={
        <ConsoleSidebar
          brand={storyBrand}
          workspaceSwitcher={storyWorkspaceSwitcher}
          groups={groups}
          footer={<span />}
        />
      }
      topBar={
        <ConsoleTopBar
          brand={storyBrand}
          workspaceSwitcher={storyTopBarWorkspaceSwitcher}
          trailing={<span />}
        />
      }>
      {route === 'overview' ? (
        <div className="flex flex-col gap-8">
          <PageHeader title="Overview" subtitle="adorsys-gis · last 30 days · UTC" />
          <OverviewStatRow cards={overviewStatCards} />
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <PageHeader title="Projects" />
            <ApiKeysLedger
              keys={apiKeysFixture}
              onRotate={() => {}}
              onRequestRevoke={() => {}}
              onConfirmRevoke={() => {}}
              onCancelRevoke={() => {}}
              isAdmin
              onRequestDelete={() => {}}
              onConfirmDelete={() => {}}
              onCancelDelete={() => {}}
            />
          </div>

          {/* Overview supplies no card here; Projects does — content that differs structurally
              between routes while the chrome (`sidebar`/`topBar`) must not remount, reproduced
              inside `children` now that the shell no longer owns a rail slot of its own (shell
              brief 2026-08-30; owner review 2026-08-29 on why this pair is the harder case). */}
          <div className="w-full lg:w-[280px] lg:flex-none">
            <Card title="Key hygiene">
              <ApiKeysHygieneNotes hygiene={apiKeysHygiene} />
            </Card>
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}

const meta: Meta<typeof PersistentShell> = {
  title: 'Pages/ShellPersistence',
  component: PersistentShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof PersistentShell>;

export const NavigationDoesNotRemountTheChrome: Story = {
  name: 'Navigating does not remount the header or nav',
  render: () => <PersistentShell />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const document = canvasElement.ownerDocument;

    // The rail nav (there are two `Primary` navs — the rail one and the bottom bar).
    const navBefore = document.querySelectorAll('nav[aria-label="Primary"]')[0];
    const headerBefore = document.querySelector('header');
    expect(navBefore).toBeTruthy();

    // Also expose them the way a human reviewer checks this in the live browser.
    (window as unknown as { __nav?: Element | null }).__nav = navBefore;

    await canvas.findByText('Spend this month');

    await userEvent.click(canvas.getAllByRole('button', { name: 'Projects' })[0]);
    await waitFor(() => expect(canvas.getByText('ci-deploy')).toBeInTheDocument());

    const navAfter = document.querySelectorAll('nav[aria-label="Primary"]')[0];
    const headerAfter = document.querySelector('header');

    // Identity, not equality: a remounted shell would produce a different DOM node.
    expect(navAfter).toBe(navBefore);
    expect(headerAfter).toBe(headerBefore);
    expect((window as unknown as { __nav?: Element | null }).__nav).toBe(navAfter);

    // And back again.
    await userEvent.click(canvas.getAllByRole('button', { name: 'Overview' })[0]);
    await waitFor(() => expect(canvas.getByText('Spend this month')).toBeInTheDocument());
    expect(document.querySelectorAll('nav[aria-label="Primary"]')[0]).toBe(navBefore);
  },
};
