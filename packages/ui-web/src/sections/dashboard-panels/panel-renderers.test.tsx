import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  dominatedStackedSeriesFixture,
  emptyPanelFixtures,
  panelFixtures,
  stackedSeriesFixture,
} from './fixtures';
import { PANEL_TABLE_PAGE_SIZE } from './sizes';
import type { PanelViewOf } from './types';
import {
  panelActionRenderers,
  panelRenderers,
  renderPanelActions,
  renderPanelBody,
} from './panel-renderers';
import { DASHBOARD_PANEL_TYPES } from './types';

describe('the panel renderer registry', () => {
  it('covers all NINE panel types, and only those', () => {
    expect(Object.keys(panelRenderers).sort()).toEqual([...DASHBOARD_PANEL_TYPES].sort());
    expect(Object.keys(panelActionRenderers).sort()).toEqual([...DASHBOARD_PANEL_TYPES].sort());
    expect(DASHBOARD_PANEL_TYPES).toHaveLength(9);
  });

  it.each(DASHBOARD_PANEL_TYPES)('renders %s from its fixture without throwing', (type) => {
    const { container } = render(<>{renderPanelBody(panelFixtures[type], 'panel')}</>);
    expect(container.firstChild).not.toBeNull();
  });

  /** "A panel with no data still renders honest structure" (console-ui skill "States") — the zone
   *  never collapses to nothing. */
  it.each(DASHBOARD_PANEL_TYPES)('renders %s in its EMPTY state without throwing', (type) => {
    const { container } = render(<>{renderPanelBody(emptyPanelFixtures[type], 'panel')}</>);
    expect(container).toBeTruthy();
  });

  /**
   * The one type that COULD collapse to nothing: a row of zero stat cards renders zero elements,
   * which is a hole where a panel was — it reads as broken rather than as "no usage". An inline
   * status line is the honest empty state (converse-frontends#448, spotted reviewing
   * `Pages/AdminUsage`'s empty story).
   */
  it('renders an inline status for an EMPTY stat-group rather than an empty row', () => {
    render(<>{renderPanelBody(emptyPanelFixtures['stat-group'], 'panel')}</>);
    expect(screen.getByText('No usage in this range.')).toBeInTheDocument();
  });

  it('lets the caller word that empty status itself', () => {
    render(
      <>
        {renderPanelBody(
          { kind: 'stat-group', stats: [], emptyMessage: 'No account drew anything.' },
          'panel'
        )}
      </>
    );
    expect(screen.getByText('No account drew anything.')).toBeInTheDocument();
  });

  it.each(DASHBOARD_PANEL_TYPES)('renders %s at the expanded size too', (type) => {
    const { container } = render(<>{renderPanelBody(panelFixtures[type], 'expanded')}</>);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('per-type mappings', () => {
  it('stat → StatCard, with its delta', () => {
    render(<>{renderPanelBody(panelFixtures.stat, 'panel')}</>);
    expect(screen.getByText('$943.60')).toBeInTheDocument();
    expect(screen.getByText(/12% vs Aug 1 – Aug 31/)).toBeInTheDocument();
  });

  it('donut → the RING, with a hole and no legend list', () => {
    const { container } = render(<>{renderPanelBody(panelFixtures.donut, 'panel')}</>);
    const wedges = container.querySelectorAll('path.donut-wedge');
    expect(wedges.length).toBeGreaterThan(0);
    for (const wedge of wedges) {
      expect((wedge.getAttribute('d') ?? '').match(/A/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
    // Values are on hover only — no static per-series list under the mark.
    expect(screen.queryByText('$812.40')).not.toBeInTheDocument();
  });

  it('donut → collapses its tail into one Other wedge', () => {
    const { container } = render(<>{renderPanelBody(panelFixtures.donut, 'panel')}</>);
    const labels = Array.from(container.querySelectorAll('path.donut-wedge')).map((w) =>
      w.getAttribute('aria-label')
    );
    expect(labels.some((label) => label?.startsWith('Other ('))).toBe(true);
  });

  it('ranked → RankedSeriesRows', () => {
    render(<>{renderPanelBody(panelFixtures.ranked, 'panel')}</>);
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('share → ShareBar', () => {
    const { container } = render(<>{renderPanelBody(panelFixtures.share, 'panel')}</>);
    expect(container.querySelector('.share-bar')).toBeInTheDocument();
  });

  it('table → LedgerTable with real row links', () => {
    render(<>{renderPanelBody(panelFixtures.table, 'panel')}</>);
    expect(screen.getByRole('link', { name: 'ada@adorsys.com' })).toHaveAttribute(
      'href',
      '/admin/usage/actors/ada%40adorsys.com?type=user'
    );
  });

  /** `Pagination` renders nothing when neither direction is wired (its own contract: "a ledger
   *  with no more pages to reach has no pagination row, not a row of two disabled buttons") — so
   *  the row appears exactly when the caller can actually page. */
  it('table → Pagination only once a direction is actually wired', () => {
    const table = panelFixtures.table;
    if (table.kind !== 'table') throw new Error('fixture is not a table');

    const { rerender } = render(<>{renderPanelBody(table, 'panel')}</>);
    expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();

    rerender(<>{renderPanelBody({ ...table, hasNext: true, onNext: () => {} }, 'panel')}</>);
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('latency-cards → LatencyStatCards, hiding a zero-sample model and a low-sample p99', () => {
    render(<>{renderPanelBody(panelFixtures['latency-cards'], 'panel')}</>);
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.queryByText('llama-3.1-70b')).not.toBeInTheDocument();
  });

  it('series/latency-series put the scale toggle in the ACTIONS slot, not in the body', () => {
    const { container } = render(<>{renderPanelBody(panelFixtures.series, 'panel')}</>);
    expect(container.querySelector('.tabs')).toBeNull();

    render(<>{renderPanelActions(panelFixtures.series, 'panel')}</>);
    expect(screen.getByRole('group', { name: 'Scale' })).toBeInTheDocument();
  });

  it('gives every non-series type no actions at all', () => {
    for (const type of DASHBOARD_PANEL_TYPES) {
      if (type === 'series' || type === 'latency-series') continue;
      expect(renderPanelActions(panelFixtures[type], 'panel'), type).toBeNull();
    }
  });
});

describe('size changes DENSITY, not just pixels', () => {
  it('shows more table rows when expanded', () => {
    const { rerender, container } = render(<>{renderPanelBody(panelFixtures.table, 'panel')}</>);
    const panelRows = container.querySelectorAll('tbody tr').length;
    rerender(<>{renderPanelBody(panelFixtures.table, 'expanded')}</>);
    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(panelRows);
  });

  it('draws a taller chart when expanded', () => {
    const { container: panel } = render(<>{renderPanelBody(panelFixtures.donut, 'panel')}</>);
    const { container: expanded } = render(<>{renderPanelBody(panelFixtures.donut, 'expanded')}</>);
    const heightOf = (root: HTMLElement) =>
      Number(root.querySelector('svg')?.getAttribute('height') ?? 0);
    expect(heightOf(expanded)).toBeGreaterThan(heightOf(panel));
  });
});

/**
 * Pagination is a property of the `table` TYPE, not a per-page opt-in (owner directive
 * 2026-09-03: "all table panels in /admin/overview need pagination"). These pin the two things
 * that makes true — a default every table gets, and a per-panel override that still scales.
 */
describe('table pagination is the engine default', () => {
  const rows = Array.from({ length: 40 }, (_, index) => ({
    key: `row-${index}`,
    cells: { label: `Actor ${index}` },
  }));
  const table: PanelViewOf<'table'> = {
    kind: 'table',
    columns: [{ key: 'label', header: 'Actor' }],
    rows,
    unit: 'actors',
    total: rows.length,
  };
  const bodyRows = (root: HTMLElement) => root.querySelectorAll('tbody tr').length;

  it('pages at 10 rows in the panel and 25 in the dialog, with no opt-in', () => {
    const { container } = render(<>{renderPanelBody(table, 'panel')}</>);
    expect(bodyRows(container)).toBe(PANEL_TABLE_PAGE_SIZE.panel);

    const { container: expanded } = render(<>{renderPanelBody(table, 'expanded')}</>);
    expect(bodyRows(expanded)).toBe(PANEL_TABLE_PAGE_SIZE.expanded);
  });

  /**
   * `hasNext` is derived from the panel's OWN row count and page size — the caller never computes
   * it — so a table only has to hand over the page index and a handler. (`Pagination` still draws
   * nothing without a handler, by its own contract: "a ledger with no more pages to reach has no
   * pagination row, not a row of two disabled buttons". In the console that handler is no longer
   * optional — `UseDashboardInput` requires the page knobs since 2026-09-03.)
   */
  it('derives hasNext from its own row count once a handler is wired', () => {
    const { container: first } = render(
      <>{renderPanelBody({ ...table, onNext: () => {} }, 'panel')}</>
    );
    expect(within(first).getByRole('button', { name: /Next/i })).toBeInTheDocument();

    // Last page (40 rows at 10/page): the row stays — there is still a Previous to press — but
    // Next is disabled, because the panel's own arithmetic says there is nothing after row 39.
    const { container: last } = render(
      <>{renderPanelBody({ ...table, page: 3, onPrev: () => {}, onNext: () => {} }, 'panel')}</>
    );
    expect(within(last).getByRole('button', { name: /Next/i })).toBeDisabled();
    expect(within(last).getByRole('button', { name: /Previous/i })).toBeEnabled();
  });

  it('takes a panel’s own `pageSize`, and still scales it for the dialog', () => {
    const { container } = render(<>{renderPanelBody({ ...table, pageSize: 4 }, 'panel')}</>);
    expect(bodyRows(container)).toBe(4);

    const { container: expanded } = render(
      <>{renderPanelBody({ ...table, pageSize: 4 }, 'expanded')}</>
    );
    // 4 × the default ratio (25/10) — one YAML number, two honest densities.
    expect(bodyRows(expanded)).toBe(10);
  });

  it('clamps a deep-linked page past the end onto the last real page', () => {
    const { container } = render(<>{renderPanelBody({ ...table, page: 99 }, 'panel')}</>);
    // 40 rows at 10/page → last page is index 3, rows 30–39.
    expect(container.textContent).toContain('Actor 39');
    expect(container.textContent).not.toContain('Actor 0\n');
  });
});

/**
 * `options.style: stacked-bars` — the owner's 2026-09-03 exception to ADR 0013/0015 D5, drawn by
 * the SAME `series` panel rather than a tenth panel type.
 */
describe('series → stacked bars', () => {
  it('draws the stacked mark instead of the line board', () => {
    const { container } = render(<>{renderPanelBody(stackedSeriesFixture, 'panel')}</>);
    // Bars, not paths: the line board draws `<path>` per series and no `<rect>` marks.
    expect(container.querySelectorAll('svg rect').length).toBeGreaterThan(0);
  });

  it('renders NO scale toggle — a log stack does not sum, so there is no axis to steer', () => {
    expect(renderPanelActions(stackedSeriesFixture, 'panel')).toBeNull();
    // …while the same panel drawn as lines still has one.
    render(<>{renderPanelActions(panelFixtures.series, 'panel')}</>);
    expect(screen.getByRole('group', { name: 'Scale' })).toBeInTheDocument();
  });

  it('states the 95%-top-1 caveat when one series dominates the period', () => {
    render(<>{renderPanelBody(dominatedStackedSeriesFixture, 'panel')}</>);
    expect(screen.getByText(/gpt-4o is \d+% of this period's total/)).toBeInTheDocument();
  });
});
