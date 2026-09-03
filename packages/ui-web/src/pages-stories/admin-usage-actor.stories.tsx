// Page-level story for `/admin/usage/actors/[actorId]` — one actor's own usage
// (converse-frontends#449, story C6), and the review surface for the engine's first
// PARAMETERISED page.
//
// **It reads the real document.** `spec-page.tsx` imports `apps/console/dashboards.yaml?raw`, so
// the nine panels below are the nine panels the console draws, in the same order, at the same
// spans, through the same `DashboardGrid` / `DashboardPanel` / renderer registry
// `dashboard-renderer.tsx` uses. Add a panel to that entry and it appears here on reload.
//
// **What this story is FOR, specifically: the HEADER.** The panels are shapes `Pages/AdminUsage`
// already reviews; what is new on this page is an identity — a name over an email for a user, a
// name over its owner for an account, a name over its parent for a project — and a way back. The
// three `type` variants exist because those three headers are three different claims, and the
// fourth (`Sentinel`) is the one an operator will actually hit: an id `resolveActorLabels` had no
// row for, which must render the page IN FULL under a labelled header rather than 404 (an explicit
// AC — the figures are this id's real usage whether or not a profile exists).
//
// The `Account` variant additionally carries the hand-written "Budget & next reset" zone, which is
// NOT a panel: it reads `getBudgetBalance` and `getEffectiveResetSchedule` over the billing period
// rather than the range picker (see `useActorBudget`). It renders in its own grid above the
// engine's — the same two-stacked-grids composition `/admin/overview` uses.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { InlineStatus } from '../components/inline-status';
import { BudgetPanel } from '../sections/budget-panel';
import { DashboardGrid } from '../sections/dashboard-grid';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { SpecPanels, specPage } from './spec-page';
import type { SpecPageState } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));
const PAGE = specPage('/admin/usage/actors/[actorId]');

interface ActorFixture {
  title: string;
  subtitle: string;
  /** The "no profile resolved" line the console renders above the grid for a sentinel id. */
  sentinel?: string;
  budget?: boolean;
}

/** The four headers this page can honestly show. Each is a different CLAIM about who the id is. */
const ACTORS: Record<string, ActorFixture> = {
  user: {
    title: 'Ada Lovelace',
    subtitle: 'User · ada@adorsys.com · This month · UTC',
  },
  account: {
    title: 'Brightline',
    subtitle: 'Account · Owner usr_01j8k2m4p · This month · UTC',
    budget: true,
  },
  project: {
    title: 'rag-api',
    subtitle: 'Project · in Brightline · This month · UTC',
  },
  sentinel: {
    title: 'usr_01j8k2m4pqr7',
    subtitle: 'User · This month · UTC',
    sentinel:
      "No profile resolved for this user id — the spend, request and token figures below are still this id's own.",
  },
};

function AdminUsageActorScreen({
  actor,
  state = 'loaded',
}: {
  actor: ActorFixture;
  state?: SpecPageState;
}) {
  const [rangePreset, setRangePreset] = React.useState<string | null>('mtd');
  const [range, setRange] = React.useState(presetRange('mtd', STORY_TODAY));

  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={actor.title}
          subtitle={actor.subtitle}
          controls={
            <DateRangeField
              label="Range"
              presets={RANGE_PRESETS}
              preset={rangePreset}
              value={range}
              today={STORY_TODAY}
              onPresetChange={(next) => {
                setRangePreset(next);
                const preset = RANGE_PRESETS.find((p) => p.value === next);
                if (preset) setRange(presetRange(preset.days, STORY_TODAY));
              }}
              onRangeChange={(next) => {
                setRangePreset(null);
                setRange(next);
              }}
              layout="inline"
              hideLabel
            />
          }
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm">
                ← Usage
              </Button>
              <Button variant="secondary">Export</Button>
            </div>
          }
        />

        {actor.sentinel ? <InlineStatus>{actor.sentinel}</InlineStatus> : null}

        {actor.budget ? (
          <DashboardGrid>
            <Card data-span="2">
              <BudgetPanel
                label="Budget & next reset"
                budget={{
                  value: 41.2,
                  ceiling: 60,
                  threshold: 0.9,
                  caption: 'account ceiling · 69% used this budget period (not the range above)',
                }}
                nextReset={{ status: 'scheduled', label: 'Next reset in 3 days → $60.00 (reset)' }}
              />
            </Card>
          </DashboardGrid>
        ) : null}

        <SpecPanels page={PAGE} state={state} />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/AdminUsageActor',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

/** A resolved person: display name over the email that disambiguates two people sharing one. */
export const User: Story = { render: () => <AdminUsageActorScreen actor={ACTORS.user} /> };

export const UserLight: Story = {
  name: 'User — wireframe (light)',
  render: () => <AdminUsageActorScreen actor={ACTORS.user} />,
  globals: { theme: 'wireframe' },
};

/** An account — the one type that also carries the budget zone. */
export const Account: Story = { render: () => <AdminUsageActorScreen actor={ACTORS.account} /> };

export const AccountLight: Story = {
  name: 'Account — wireframe (light)',
  render: () => <AdminUsageActorScreen actor={ACTORS.account} />,
  globals: { theme: 'wireframe' },
};

/** A project — named with its parent account, because "rag-api" is not distinguishing on an
 *  estate-wide console. */
export const Project: Story = { render: () => <AdminUsageActorScreen actor={ACTORS.project} /> };

export const ProjectLight: Story = {
  name: 'Project — wireframe (light)',
  render: () => <AdminUsageActorScreen actor={ACTORS.project} />,
  globals: { theme: 'wireframe' },
};

/** The case the negative AC is about: an id nothing resolved. The page renders in FULL under a
 *  labelled header and an inline status line — never a 404 for an id that has usage rows. */
export const Sentinel: Story = { render: () => <AdminUsageActorScreen actor={ACTORS.sentinel} /> };

export const SentinelLight: Story = {
  name: 'Unresolved id — wireframe (light)',
  render: () => <AdminUsageActorScreen actor={ACTORS.sentinel} />,
  globals: { theme: 'wireframe' },
};

/** Nothing drew anything in the window. Every panel keeps its zone and states the absence inline —
 *  an axis still drawn, a ring outline still drawn, a status line where the rows would be. */
export const Empty: Story = {
  render: () => <AdminUsageActorScreen actor={ACTORS.user} state="empty" />,
};

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  render: () => <AdminUsageActorScreen actor={ACTORS.user} state="empty" />,
  globals: { theme: 'wireframe' },
};

/** Every request failed. In the console a panel fails ALONE — this is the all-failed extreme,
 *  shown because it is the layout that has to survive it. */
export const Errored: Story = {
  render: () => <AdminUsageActorScreen actor={ACTORS.user} state="error" />,
};

export const ErroredLight: Story = {
  name: 'Errored — wireframe (light)',
  render: () => <AdminUsageActorScreen actor={ACTORS.user} state="error" />,
  globals: { theme: 'wireframe' },
};

/** The one-column tier: every panel is full width, `span: 2` included. */
export const MobileBaseTier: Story = {
  render: () => <AdminUsageActorScreen actor={ACTORS.account} />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <AdminUsageActorScreen actor={ACTORS.account} />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
