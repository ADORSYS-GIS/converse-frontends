import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import { BUDGET_PRESSURE_SCOPE_NOTE } from './use-admin-overview-screen';
import type { AdminOverviewScreen } from './use-admin-overview-screen';

/**
 * Container-level acceptance coverage for the admin overview — the operator's dashboard, as
 * opposed to `/`, which is a dashboard per user.
 *
 * Two properties matter here and nowhere else:
 *
 *  1. **Latency belongs to this screen.** It was removed from `/` deliberately (owner,
 *     2026-08-29 — per-bucket p95 by model is an operator's metric), and `LatencyDashboard`/
 *     `LatencyRidgeline` were kept in the library precisely so this screen could take them. A
 *     regression that quietly dropped it here would leave the two components with no consumer at
 *     all, which is exactly how a section rots.
 *  2. **Nothing is fabricated at account scope.** A failed query must never render as `0`; a
 *     ceiling that could not be read must render no meter rather than a full one; and the fact
 *     that projects have no ceiling of their own must be stated in DOM text (never SVG `<text>`,
 *     which does not wrap and spilled off both ends of the plot the last time copy went in there).
 *
 * `useAdminOverviewScreen` is mocked wholesale, the same split `overview-centre.test.tsx` uses:
 * the hook's own request/response mapping is already covered cheaply by `overview-usage.test.ts`'s
 * pure-function tests, and what this file asks is the different, black-box question — given a
 * status, does the CENTRE render the corresponding honest shape.
 */
const useAdminOverviewScreenMock = vi.fn();
vi.mock('./use-admin-overview-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-admin-overview-screen')>();
  return {
    ...actual,
    useAdminOverviewScreen: () => useAdminOverviewScreenMock(),
  };
});

function baseScreen(overrides: Partial<AdminOverviewScreen> = {}): AdminOverviewScreen {
  return {
    subline: 'Last 30 days · every project in this account · UTC',
    statCards: [],
    statCardsLoading: false,
    spendLabel: 'Spend — every project in this account',
    spendShareLabel: 'Spend — share by project',
    rangeField: {
      label: 'Range',
      preset: '30d',
      presets: [{ value: '30d', label: 'Last 30 days', days: 30 }],
      value: { from: new Date(Date.UTC(2026, 6, 31)), to: new Date(Date.UTC(2026, 7, 29)) },
      onPresetChange: vi.fn(),
      onRangeChange: vi.fn(),
    },
    bucketField: { label: 'Bucket', value: 'day', options: [], onChange: vi.fn() },
    groupByField: { label: 'Group by', value: 'project', options: [], onChange: vi.fn() },
    selectedSeriesKey: null,
    setSelectedSeriesKey: vi.fn(),
    spendSeries: [],
    spendSegments: [],
    spendTotal: undefined,
    spendStatus: 'ready',
    spendErrorMessage: undefined,
    spendRetry: vi.fn(),
    latencySeries: [],
    latencyStatus: 'ready',
    latencyErrorMessage: undefined,
    latencyRetry: vi.fn(),
    latencyFootnote: undefined,
    budget: { status: 'loading' },
    refillRequestStatus: undefined,
    pressure: {
      projects: [],
      ceiling: 12,
      status: 'ready',
      errorMessage: undefined,
      onRetry: vi.fn(),
      note: BUDGET_PRESSURE_SCOPE_NOTE,
    },
    hygiene: {
      expiringCount: 0,
      expiringInDays: 30,
      neverUsedCount: 0,
      revokedRetainedCount: 0,
    },
    hygieneSummary: '12 active · 3 revoked',
    hygieneCaveat: undefined,
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<AdminOverviewScreen> = {}) {
  useAdminOverviewScreenMock.mockReturnValue(baseScreen(overrides));
  const { AdminOverviewCentre } = await import('./admin-overview-centre');
  return render(<AdminOverviewCentre />, { wrapper: withNuqsTestingAdapter() });
}

// The full dashboard renders two real d3-backed charts through jsdom — same measured environment
// factor `overview-centre.test.tsx` documents for its own equivalent test.
const FULL_DASHBOARD_RENDER_TIMEOUT_MS = 15_000;

describe('AdminOverviewCentre', () => {
  it(
    'renders latency — the section `/` deliberately gave up, with its per-series footnote',
    async () => {
      await renderCentre({
        latencySeries: [
          { key: 'gpt-4o', label: 'gpt-4o', values: [120, 180], value: 'peak p95 180 ms' },
          {
            key: 'signal-summary',
            label: 'signal-summary',
            values: [],
            value: 'no latency reported',
          },
        ],
        latencyFootnote:
          'No latency reported for signal-summary — aggregate metric signals carry a bucketed distribution, not a per-request duration.',
      });

      expect(screen.getByText(/p95 per bucket/i)).toBeInTheDocument();
      // The gap is NAMED, not hidden and not turned into an error line.
      expect(screen.getByText(/No latency reported for signal-summary/)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );

  it(
    'says spend is account-wide rather than implying the scoped project',
    async () => {
      await renderCentre();

      expect(screen.getByText('Spend — every project in this account')).toBeInTheDocument();
      expect(
        screen.getByText('Last 30 days · every project in this account · UTC')
      ).toBeInTheDocument();
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );

  it(
    'states the per-project-ceiling gap as DOM text, never inside an SVG',
    async () => {
      const { container } = await renderCentre({
        pressure: {
          projects: [{ key: 'proj_1', name: 'gateway-prod', spend: 10.94 }],
          ceiling: 12,
          status: 'ready',
          onRetry: vi.fn(),
          note: BUDGET_PRESSURE_SCOPE_NOTE,
        },
      });

      const note = screen.getByText(BUDGET_PRESSURE_SCOPE_NOTE);
      expect(note.tagName).toBe('P');
      // Axis ticks are legitimately SVG text; the caveat copy must never be.
      for (const svgText of container.querySelectorAll('svg text')) {
        expect(svgText.textContent).not.toContain('governance tier');
      }
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );

  it(
    'renders no meter at all when the account ceiling could not be read',
    async () => {
      const { container } = await renderCentre({
        pressure: {
          projects: [{ key: 'proj_1', name: 'gateway-prod', spend: 10.94 }],
          ceiling: null,
          status: 'ready',
          onRetry: vi.fn(),
          note: BUDGET_PRESSURE_SCOPE_NOTE,
        },
        budget: { status: 'loading' },
      });

      expect(container.querySelectorAll('[role="meter"]')).toHaveLength(0);
      // The real spend survives — only the comparison is withheld.
      expect(screen.getByText('$10.94')).toBeInTheDocument();
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );

  it(
    'surfaces a failed budget query as a retryable signal line, never as a zero',
    async () => {
      await renderCentre({
        budget: {
          status: 'error',
          errorMessage: 'The usage backend is unreachable right now.',
          onRetry: vi.fn(),
        },
      });

      expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
        'The usage backend is unreachable right now.'
      );
      expect(screen.queryByText('$0.00 of $0.00')).not.toBeInTheDocument();
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );

  it(
    'reports key hygiene at account scope, and says so when the count is partial',
    async () => {
      await renderCentre({
        hygiene: {
          expiringCount: 2,
          expiringInDays: 30,
          neverUsedCount: 1,
          revokedRetainedCount: 4,
        },
        hygieneSummary: '12 active · 4 revoked · 2 expiring within 30 days',
        hygieneCaveat:
          'Counted over the first 100 of 214 keys the listing returned — any of this account’s keys beyond that page are not included.',
      });

      expect(screen.getByText('Key hygiene — every project in this account')).toBeInTheDocument();
      expect(screen.getByText('2 keys expires in 30 days')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Counted over the first 100 of 214 keys the listing returned — any of this account’s keys beyond that page are not included.'
        )
      ).toBeInTheDocument();
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );

  it(
    'omits the refill-request block entirely when nothing is pending',
    async () => {
      await renderCentre({ refillRequestStatus: undefined });

      expect(screen.queryByText('Review in Admin →')).not.toBeInTheDocument();
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );
});
