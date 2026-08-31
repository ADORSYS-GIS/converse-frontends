import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { OverviewScreen as OverviewScreenData } from './use-overview-screen';

/**
 * Container-level acceptance coverage for the story's own governing principle (Story 4.2 / #300):
 * a panel with real data shows real data; a panel whose query FAILED must never fall back to `0`
 * or to a confirmed-empty rendering.
 *
 * LATENCY is gone (phase 9.2, 2026-08-30 owner directive — the usage backend's events are
 * aggregate metric signals with no per-request duration, so that panel could never fill). SPEND BY
 * MODEL replaces it, for every user rather than admin-only, and follows the exact same real-data/
 * failed-query honesty contract SPEND already does — covered below alongside it.
 *
 * `useOverviewScreen` is mocked wholesale rather than its own dependencies (refine, the budget
 * RPC client, `queryUsage`) individually — that hook's OWN request/response mapping is already
 * covered thoroughly and cheaply by `overview-usage.test.ts`'s pure-function tests; what this file
 * checks is a different, black-box question: given a `status`, does the CENTRE actually render the
 * corresponding honest shape, not a fabricated one.
 */
const useOverviewScreenMock = vi.fn();
vi.mock('./use-overview-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-overview-screen')>();
  return {
    ...actual,
    useOverviewScreen: () => useOverviewScreenMock(),
  };
});

function baseScreen(overrides: Partial<OverviewScreenData> = {}): OverviewScreenData {
  return {
    scopeAccountLabel: 'adorsys-gis',
    scopeProjectLabel: 'All projects',
    subline: 'Last 30d · UTC',
    statCards: [],
    statCardsLoading: false,
    selectedSeriesKey: null,
    setSelectedSeriesKey: vi.fn(),
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
    projectField: { label: 'Project', value: '', options: [], onChange: vi.fn() },
    spendSeries: [],
    spendStatus: 'ready',
    spendErrorMessage: undefined,
    spendRetry: vi.fn(),
    spendTruncated: false,
    spendSegments: [],
    spendUnassignedCaption: undefined,
    spendShareStatus: 'ready',
    spendShareErrorMessage: undefined,
    spendShareRetry: vi.fn(),
    spendDegenerateMessage: undefined,
    modelSpendSeries: [],
    // `'linear'` (not the real screen's own `'log'` default) purely to keep this fixture's empty
    // SPEND BY MODEL board's y-axis off `MultiSeriesSpendChart`'s log-scale "nothing positive to
    // plot" fallback domain (`domain.ts`'s `computeYDomain`, `[0.01, 1]`) — that fallback's own
    // `$0.01` tick label collided with SPEND/BudgetHero's unrelated "never renders `$0.01`"
    // assertions below, which have nothing to do with this board. Tests that DO care about the
    // board's scale override it explicitly.
    modelSpendScale: 'linear',
    setModelSpendScale: vi.fn(),
    modelSpendStatus: 'ready',
    modelSpendErrorMessage: undefined,
    modelSpendRetry: vi.fn(),
    budget: { status: 'unwired', caption: 'Budget figures arrive with the budget query wiring.' },
    refillHref: '/accounts/acct_1/refill',
    refillAction: undefined,
    report: {
      open: false,
      onOpenChange: vi.fn(),
      period: '2026-08',
      onPeriodChange: vi.fn(),
      scopeSlot: null,
      groupByOptions: [
        { value: 'project', label: 'Project' },
        { value: 'model', label: 'Model' },
      ],
      groupBy: 'project',
      onGroupByChange: vi.fn(),
      includeToggles: [],
      onToggleInclude: vi.fn(),
      format: 'csv',
      onFormatChange: vi.fn(),
      onGenerate: vi.fn(),
      generating: false,
      notice: undefined,
    },
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<OverviewScreenData> = {}) {
  useOverviewScreenMock.mockReturnValue(baseScreen(overrides));
  const { OverviewCentre } = await import('./overview-centre');
  return render(<OverviewCentre />, { wrapper: withNuqsTestingAdapter() });
}

describe('OverviewCentre', () => {
  /**
   * 15s, not the 5s default, and measured rather than guessed.
   *
   * This is the only test here that renders the FULL dashboard — a real Recharts spend chart plus
   * a donut — through jsdom. It runs in ~580ms locally and ~5.05s on the shared CI runner: a ~9x
   * environment factor, which is ordinary for a loaded self-hosted runner but leaves it 1% under
   * the default limit. It failed three times on 2026-08-29 at 5048ms, 5057ms and once more, always
   * for the timeout and never for an assertion, and passed on re-run each time.
   *
   * Raising the budget for THIS test is the honest fix; re-running until green is not, and a
   * global `testTimeout` bump would hide the next genuinely-slow test. If this ever needs raising
   * again, that is the signal to split the chart render out rather than to add another second.
   */
  const FULL_DASHBOARD_RENDER_TIMEOUT_MS = 15_000;

  it(
    'renders SPEND with real data when the usage query succeeded (status="ready")',
    async () => {
      await renderCentre({
        spendStatus: 'ready',
        // Two series: `ChartLegend` renders no legend at all for exactly one series (a single
        // series needs no identification, per the dataviz skill) — this asserts the legend ITSELF
        // renders real labels, which needs at least two to be a meaningful check.
        spendSeries: [
          { key: 'proj_a', label: 'proj_a', points: [{ x: new Date('2026-08-01'), y: 42 }] },
          { key: 'proj_b', label: 'proj_b', points: [{ x: new Date('2026-08-01'), y: 7 }] },
        ],
      });

      // A real series renders the chart's legend entry for it -- the SAME text that would be
      // absent for an empty (but real) result, and absent from an error/loading render too.
      expect(screen.getByText('proj_a')).toBeInTheDocument();
      expect(screen.getByText('proj_b')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
    FULL_DASHBOARD_RENDER_TIMEOUT_MS
  );

  // 2026-08-31 owner-round parity fix #3: the degenerate (<=1 distinct segment) suppression moved
  // OFF the SPEND chart (a single-series TIME SERIES is still a meaningful "spend over time"
  // reading now that it plots the account TOTAL, never a per-project split) and onto SPEND BY
  // PROJECT's own `SpendShareSection` instead — a single-segment BREAKDOWN is the one that
  // asserts a distribution the data doesn't have.
  it('renders spendDegenerateMessage in place of SPEND BY PROJECT, never the SPEND chart, when the screen reports one', async () => {
    const { container } = await renderCentre({
      spendStatus: 'ready',
      spendSeries: [
        { key: 'account-total', label: 'This period', points: [{ x: new Date('2026-08-01'), y: 42 }] },
        { key: 'previous-period', label: 'Previous period', points: [{ x: new Date('2026-08-01'), y: 30 }] },
      ],
      spendShareStatus: 'ready',
      spendSegments: [{ key: 'proj_a', label: 'proj_a', value: 42, formattedValue: '$42.00' }],
      spendDegenerateMessage: 'Only one project in this window (proj_a).',
    });

    expect(screen.getByText('Only one project in this window (proj_a).')).toBeInTheDocument();
    // The chart itself keeps drawing — its own real two-series legend still renders.
    expect(screen.getByText('This period')).toBeInTheDocument();
    expect(screen.getByText('Previous period')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('a FAILED spend (chart) query renders an error line, never a zero-value or confirmed-empty chart', async () => {
    await renderCentre({
      spendStatus: 'error',
      spendErrorMessage: 'The usage backend is unreachable right now.',
      spendSeries: [],
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes('unreachable'))).toBe(true);
    // `SpendDashboard`'s own `status === 'error'` branch renders `ErrorLine` INSTEAD of
    // `SpendSeriesChart` (mutually exclusive ternary) -- so the chart's "confirmed empty" message
    // is structurally unreachable here, never merely absent by coincidence. Exactly ONE alert
    // fires now that the chart and SPEND BY PROJECT are independently-queried zones with their
    // own statuses (`spendStatus` vs `spendShareStatus`) -- `spendShareStatus` stays `'ready'` in
    // this fixture, so `SpendShareSection` renders no `ErrorLine` of its own.
    expect(alerts).toHaveLength(1);
  });

  it('a FAILED spend-share query renders SPEND BY PROJECT’s own error line, independent of the chart', async () => {
    await renderCentre({
      spendShareStatus: 'error',
      spendShareErrorMessage: 'The usage backend is unreachable right now.',
      spendSegments: [],
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes('unreachable'))).toBe(true);
  });

  // Phase 9.2 — SPEND BY MODEL replaces the deleted LATENCY panel, for every user (never
  // admin-gated). Renders directly under SPEND BY PROJECT, real data shown as real data.
  //
  // 2026-08-31 owner ruling: this board is `MultiSeriesSpendChart` now, not a ranked row list —
  // per-series names/values no longer render as visible DOM text (that lived in the deleted
  // legend); they live in the hover tooltip and in each line's own `aria-label` instead. "Real
  // data shown as real data" is asserted here via the board's own caption sentence (the true
  // period total the deleted legend used to state as a row) and the accessible hit-path labels.
  it('renders SPEND BY MODEL with real data for every user, not just an admin', async () => {
    await renderCentre({
      modelSpendStatus: 'ready',
      modelSpendSeries: [
        {
          key: 'gpt-4o-mini',
          label: 'gpt-4o-mini',
          points: [{ x: new Date('2026-08-01'), y: 12 }],
        },
        {
          key: 'claude-sonnet',
          label: 'claude-sonnet',
          points: [{ x: new Date('2026-08-01'), y: 4 }],
        },
      ],
    });

    expect(screen.getByText('Spend by model')).toBeInTheDocument();
    // The caption states the true period total across both real series (12 + 4 = 16).
    expect(screen.getByText('$16.00 across 2 series')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gpt-4o-mini/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claude-sonnet/ })).toBeInTheDocument();
  });

  it('a FAILED spend-by-model query renders an error line, never a zero-value or confirmed-empty chart', async () => {
    await renderCentre({
      modelSpendStatus: 'error',
      modelSpendErrorMessage: 'The usage backend is unreachable right now.',
      modelSpendSeries: [],
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes('unreachable'))).toBe(true);
  });

  /**
   * The defect this guards: `OverviewCentre` passed NO `formatYTick`/`formatTooltipValue`/
   * `formatLegendValue` to `SpendDashboard` at all, so the chart fell back to its unit-agnostic
   * default (`String(Math.round(v))`). Against real production magnitudes — an account at
   * $0.006338 of a $12.00 ceiling — that labels every y-axis tick and every legend value `0`: no
   * currency sign, no magnitude, nothing.
   *
   * Asserted at the container, not the primitive, because the primitive is CORRECT to be
   * unit-blind (`HistogramChart` renders raw numeric samples through the same kind of props). The
   * bug was only ever "this container forgot to say these numbers are money", and only a
   * container-level render can see it.
   */
  it('renders real sub-cent spend as USD, never as the unit-blind default "0"', async () => {
    await renderCentre({
      spendStatus: 'ready',
      spendSeries: [
        { key: 'proj_a', label: 'proj_a', points: [{ x: new Date('2026-08-01'), y: 0.006338 }] },
        { key: 'proj_b', label: 'proj_b', points: [{ x: new Date('2026-08-01'), y: 0.000_12 }] },
      ],
      spendSegments: [
        { key: 'proj_a', label: 'proj_a', value: 0.006338 },
        { key: 'proj_b', label: 'proj_b', value: 0.000_12 },
      ],
    });

    // The chart legend states each series' total in USD at a precision that survives the trip.
    expect(screen.getAllByText('$0.0063').length).toBeGreaterThan(0);
    // The donut centre states the real total, not a rounded-to-nothing `$0.01`.
    expect(screen.getByText('$0.0065')).toBeInTheDocument();
    // Nothing anywhere renders the bare, unit-less `0` the default formatter produced.
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.01')).not.toBeInTheDocument();
  });

  /**
   * The hero's own half of the same defect: a sub-cent consumption against a real ceiling must
   * read as a comparison, not as `$0.01 of $12.00` (or, a hair lower, `$0.00 of $12.00`).
   */
  it('renders a sub-cent budget hero against its ceiling at usable precision', async () => {
    await renderCentre({
      budget: { value: 0.006338, ceiling: 12, caption: 'account ceiling · 0.05% used' },
    });

    expect(screen.getByText('$0.0063')).toBeInTheDocument();
    expect(screen.getByText('of $12.00')).toBeInTheDocument();
    expect(screen.queryByText('$0.01')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it("a FAILED budget query renders BudgetHero's error line, never a fabricated $0.00", async () => {
    await renderCentre({
      budget: { status: 'error', errorMessage: 'Failed to load budget consumption.' },
    });

    expect(
      screen.getAllByRole('alert').some((el) => el.textContent?.includes('budget consumption'))
    ).toBe(true);
    expect(screen.queryByText(/^\$0\.00/)).not.toBeInTheDocument();
  });

  it('renders BudgetHero with the real ceiling once budget data is ready', async () => {
    await renderCentre({
      budget: { value: 142.55, ceiling: 500, caption: 'account ceiling · 28% used' },
    });

    expect(screen.getByText('$142.55')).toBeInTheDocument();
    expect(screen.getByText('of $500.00')).toBeInTheDocument();
  });

  it('shows the account-level refill control only when the screen reports one is available, navigating to its href', async () => {
    await renderCentre({
      budget: { value: 478.4, ceiling: 500, caption: '96% used' },
      refillAction: { label: 'Request refill (+$30)', href: '/accounts/acct_1/refill' },
    });

    const link = screen.getByRole('button', { name: 'Request refill (+$30)' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/accounts/acct_1/refill');
  });

  it('omits the breach-state refill control when the screen reports none is available, but keeps the standing header action navigating to refillHref', async () => {
    // 2026-08-30 owner round ("budget refill form disappeared"): the breach-only inline button
    // (`heroAction`, beside the numeral) is still conditional on `refillAction`, but the standing
    // secondary "Request refill…" action on the Budget card's OWN header (`BudgetPanel.actions`)
    // is unconditional now — reachable well before any breach, not just at/past 90%. IA v3 phase
    // 3: both navigate to `/accounts/<id>/refill` rather than opening a dialog.
    await renderCentre({ refillAction: undefined, refillHref: '/accounts/acct_1/refill' });

    const link = screen.getByRole('button', { name: 'Request refill…' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/accounts/acct_1/refill');
  });

  // IA v3 phase 4 (build brief §7): `/` renders NO admin-only zone any more — BUDGET PRESSURE and
  // KEY HYGIENE moved to `/settings/overview/project` and `/settings/overview/account`
  // respectively (see `settings-overview-centre.test.tsx` for their coverage there), and the
  // pending-refill count is gone outright (it lives in the settings nav's own numeral). This is a
  // structural, not a role-conditional, guarantee now: `OverviewScreen` has no `isAdmin`/
  // `adminPressure`/`adminHygiene`/`refillRequestStatus` field left to gate on.
  it('never renders an admin-only zone — the admin cards live under /settings/overview now', async () => {
    await renderCentre();

    expect(screen.queryByText('Budget pressure')).not.toBeInTheDocument();
    expect(screen.queryByText('Key hygiene')).not.toBeInTheDocument();
    expect(screen.queryByText('Refill requests')).not.toBeInTheDocument();
  });
});
