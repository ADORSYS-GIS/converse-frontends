import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DASHBOARD_PANEL_TYPES } from '@lightbridge/ui-web/src/sections/dashboard-panels';
import type { DashboardPanelView } from '@lightbridge/ui-web/src/sections/dashboard-panels';

import { dashboardsFileSchema } from './dashboard-spec';
import { DashboardRenderer, panelActionRenderers, panelRenderers } from './dashboard-renderer';
import { IDENTITY_LABEL_FOR } from './actor-labels';
import type { DashboardPanelState, DashboardState } from './use-dashboard';

/**
 * The renderer's own contract, checked from the CONSOLE side of the `ui-web` boundary — the
 * registry lives in `ui-web` (so Storybook can drive it), and this is where its coverage is
 * asserted against the console's own zod schema, which is the other half of "an unknown panel type
 * is never a silent skip".
 */

function panel(overrides: Partial<DashboardPanelState> = {}): DashboardPanelState {
  return {
    id: 'p1',
    // `series` rather than `stat` so the default panel keeps the CARD chrome (a `stat` panel is
    // deliberately bare — see `DashboardPanelProps.chrome`); the stat VIEW below is just the
    // cheapest body to assert against.
    type: 'series',
    title: 'Total cost',
    span: 1,
    status: 'ready',
    view: { kind: 'stat', label: 'Total cost', metric: '$120.00' },
    onRetry: vi.fn(),
    ...overrides,
  };
}

function state(panels: DashboardPanelState[]): DashboardState {
  return {
    panels,
    resolved: {
      route: '/admin/usage',
      queries: [],
      panels: [],
      window: { start: new Date(0), end: new Date(0) },
    },
    requestCount: 1,
    // The page's own identity resolver (story C6) — sentinels only, which is exactly what every
    // panel gets while the batch is in flight. This test is about CHROME, not names.
    labelFor: IDENTITY_LABEL_FOR,
    actorLabelsStatus: 'idle',
  };
}

describe('the renderer registry', () => {
  it('covers all NINE panel types', () => {
    expect(Object.keys(panelRenderers).sort()).toEqual([...DASHBOARD_PANEL_TYPES].sort());
    expect(Object.keys(panelRenderers)).toHaveLength(9);
  });

  it('has an actions entry for every type too, so a type cannot half-exist', () => {
    expect(Object.keys(panelActionRenderers).sort()).toEqual([...DASHBOARD_PANEL_TYPES].sort());
  });

  /** The schema and the registry must name the same vocabulary from both directions — one list,
   *  two consumers, no drift. */
  it('accepts exactly the types the spec schema accepts', () => {
    for (const type of DASHBOARD_PANEL_TYPES) {
      const parsed = dashboardsFileSchema.safeParse({
        pages: [
          {
            route: '/x',
            filters: [],
            panels: [
              {
                id: 'a',
                type,
                title: 't',
                span: 1,
                metric: 'cost',
                query: { scope: 'all', limit: 1 },
              },
            ],
          },
        ],
      });
      expect(parsed.success, type).toBe(true);
      expect(panelRenderers[type]).toBeTypeOf('function');
    }
  });
});

describe('DashboardRenderer', () => {
  it('renders one panel per entry, each in its own card with an Expand action', () => {
    render(
      <DashboardRenderer state={state([panel(), panel({ id: 'p2', title: 'Total requests' })])} />
    );
    expect(screen.getAllByText('$120.00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Expand Total cost' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Total requests' })).toBeInTheDocument();
  });

  /** The AC: "one panel's query fails → that panel shows its error state and the rest of the page
   *  still renders." A page-level status would take the whole board down with one bad request. */
  it('isolates a failed panel — its neighbours still render their data', () => {
    render(
      <DashboardRenderer
        state={state([
          panel({
            id: 'bad',
            title: 'Broken',
            status: 'error',
            view: undefined,
            errorMessage: 'Upstream is down.',
          }),
          panel({ id: 'good', title: 'Fine' }),
        ])}
      />
    );

    expect(screen.getByText('Upstream is down.')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    // The failed panel keeps its card, its title and its Expand button — the page never reflows.
    expect(screen.getByRole('button', { name: 'Expand Broken' })).toBeInTheDocument();
  });

  /**
   * ADR 0013 D5, and an explicit AC of story C5: a truncated response gets an EXPLICIT caption
   * naming the limit. Rendered here, once, for every panel type rather than as a field on each of
   * the nine view shapes — which would have made it something a renderer could forget.
   */
  it('captions a truncated panel, naming the limit that dropped the data', () => {
    render(
      <DashboardRenderer
        state={state([
          panel({ truncationCaption: 'Showing the most recent 2,000 time buckets — older…' }),
          panel({ id: 'p2', title: 'Untruncated' }),
        ])}
      />
    );
    expect(screen.getByText(/Showing the most recent 2,000 time buckets/)).toBeInTheDocument();
    // And exactly one panel carries it — a caption is not decoration on every card.
    expect(screen.getAllByText(/Showing the most recent/)).toHaveLength(1);
  });

  it('shows no truncation caption when the backend returned everything', () => {
    render(<DashboardRenderer state={state([panel()])} />);
    expect(screen.queryByText(/Showing the most recent/)).not.toBeInTheDocument();
  });

  /**
   * A BARE panel (`stat`/`stat-group`) has no heading row: its title is the `StatCard`'s own label,
   * which only exists once data lands. Without this, a page of failed stats is a column of
   * identical "Upstream is down." lines with nothing saying WHICH reading is missing —
   * converse-frontends#448, found reviewing `Pages/AdminUsage`'s errored story.
   */
  it('restates a BARE panel own title while it is failed or loading', () => {
    render(
      <DashboardRenderer
        state={state([
          panel({
            id: 'bare-error',
            type: 'stat',
            title: 'Total cost',
            status: 'error',
            view: undefined,
            errorMessage: 'Upstream is down.',
          }),
          panel({
            id: 'bare-loading',
            type: 'stat',
            title: 'Active actors',
            status: 'loading',
            view: undefined,
          }),
        ])}
      />
    );
    expect(screen.getByText('Total cost')).toBeInTheDocument();
    expect(screen.getByText('Active actors')).toBeInTheDocument();
  });

  it('does NOT restate the title on a ready bare panel — the StatCard already carries it', () => {
    render(<DashboardRenderer state={state([panel({ type: 'stat', title: 'Total cost' })])} />);
    // Exactly once: the card's own label, not a duplicate above it.
    expect(screen.getAllByText('Total cost')).toHaveLength(1);
  });

  it('renders a skeleton, not a spinner and not a missing card, while loading', () => {
    const { container } = render(
      <DashboardRenderer state={state([panel({ status: 'loading', view: undefined })])} />
    );
    expect(container.querySelector('.skeleton')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Total cost' })).toBeInTheDocument();
  });

  it('spans a `span: 2` panel across both grid columns', () => {
    const { container } = render(
      <DashboardRenderer state={state([panel({ span: 2 }), panel({ id: 'p2', span: 1 })])} />
    );
    const cards = container.querySelectorAll('.dashboard-panel');
    expect(cards[0].getAttribute('data-span')).toBe('2');
    expect(cards[1].getAttribute('data-span')).toBeNull();
  });

  it('puts the scale toggle in the panel actions slot for a series panel', () => {
    const view: DashboardPanelView = {
      kind: 'series',
      series: [],
      scale: 'linear',
      onScaleChange: vi.fn(),
    };
    render(<DashboardRenderer state={state([panel({ title: 'Cost over time', view })])} />);
    // Base UI's Toggle Group is a toolbar-of-toggles, not a radiogroup (see `SegmentedControl`'s
    // own doc comment on why the radiogroup roles went with the hand-rolled switch they needed).
    expect(screen.getByRole('group', { name: 'Scale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Linear' })).toBeInTheDocument();
  });
});
