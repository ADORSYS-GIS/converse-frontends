import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { emptyPanelFixtures, panelFixtures } from './fixtures';
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

  it.each(DASHBOARD_PANEL_TYPES)('renders %s at the expanded size too', (type) => {
    const { container } = render(<>{renderPanelBody(panelFixtures[type], 'expanded')}</>);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('per-type mappings', () => {
  it('stat → StatCard, with its delta', () => {
    render(<>{renderPanelBody(panelFixtures.stat, 'panel')}</>);
    expect(screen.getByText('$943.60')).toBeInTheDocument();
    expect(screen.getByText(/12% vs previous month/)).toBeInTheDocument();
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
