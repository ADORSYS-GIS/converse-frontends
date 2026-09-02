import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DASHBOARD_PANEL_TYPES } from '@lightbridge/ui-web/src/sections/dashboard-panels';
import type { DashboardPanelView } from '@lightbridge/ui-web/src/sections/dashboard-panels';

import { dashboardsFileSchema } from './dashboard-spec';
import { DashboardRenderer, panelActionRenderers, panelRenderers } from './dashboard-renderer';
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
