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
    spendSegments: [],
    spendStatus: 'ready',
    spendErrorMessage: undefined,
    spendRetry: vi.fn(),
    modelSpendSegments: [],
    modelSpendStatus: 'ready',
    modelSpendErrorMessage: undefined,
    modelSpendRetry: vi.fn(),
    budget: { status: 'unwired', caption: 'Budget figures arrive with the budget query wiring.' },
    refillAction: undefined,
    refillErrorMessage: undefined,
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
    // Phase 4 role-parameterised block — defaults to a non-admin: every admin-only card is
    // undefined, never a permanently-loading placeholder (see `use-overview-screen.ts`'s own
    // doc comment).
    isAdmin: false,
    adminPressure: undefined,
    adminHygiene: undefined,
    refillRequestStatus: undefined,
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

  it('a FAILED spend query renders an error line, never a zero-value or confirmed-empty chart', async () => {
    await renderCentre({
      spendStatus: 'error',
      spendErrorMessage: 'The usage backend is unreachable right now.',
      spendSeries: [],
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes('unreachable'))).toBe(true);
    // The failed chart's own message is present -- not "No usage in this range." (which would
    // claim a completed, empty query) and not a fabricated series.
    expect(screen.queryByText('No usage in this range.')).not.toBeInTheDocument();
  });

  // Phase 9.2 — SPEND BY MODEL replaces the deleted LATENCY panel, for every user (never
  // admin-gated). Renders directly under SPEND BY PROJECT, real data shown as real data.
  it('renders SPEND BY MODEL with real data for every user, not just an admin', async () => {
    await renderCentre({
      isAdmin: false,
      modelSpendStatus: 'ready',
      modelSpendSegments: [
        { key: 'gpt-4o-mini', label: 'gpt-4o-mini', value: 12, formattedValue: '$12.00' },
        { key: 'claude-sonnet', label: 'claude-sonnet', value: 4, formattedValue: '$4.00' },
      ],
    });

    expect(screen.getByText('Spend by model')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet')).toBeInTheDocument();
  });

  it('a FAILED spend-by-model query renders an error line, never a zero-value or confirmed-empty share bar', async () => {
    await renderCentre({
      modelSpendStatus: 'error',
      modelSpendErrorMessage: 'The usage backend is unreachable right now.',
      modelSpendSegments: [],
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

  it('shows the account-level refill control only when the screen reports one is available', async () => {
    const onClick = vi.fn();
    await renderCentre({
      budget: { value: 478.4, ceiling: 500, caption: '96% used' },
      refillAction: { label: 'Request refill (+$30)', onClick, pending: false },
    });

    const button = screen.getByRole('button', { name: 'Request refill (+$30)' });
    expect(button).toBeInTheDocument();
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the refill control when the screen reports none is available', async () => {
    await renderCentre({ refillAction: undefined });

    expect(screen.queryByRole('button', { name: /Request refill/ })).not.toBeInTheDocument();
  });

  // Phase 4 — one dashboard, parameterised by role (LATENCY removed from the block in phase 9.2 —
  // three admin-only cards remain). They must never render for a non-admin, and must render with
  // real data for an admin — never a permanently-loading placeholder in between (see
  // `use-overview-screen.ts`'s own doc comment on why these are `undefined`, not a `status:
  // 'loading'` shape, for a non-admin).
  describe('the admin-only block', () => {
    it('renders none of the three admin cards for a non-admin', async () => {
      await renderCentre({ isAdmin: false });

      expect(screen.queryByText('Budget pressure')).not.toBeInTheDocument();
      expect(screen.queryByText('Key hygiene')).not.toBeInTheDocument();
      expect(screen.queryByText('Refill requests')).not.toBeInTheDocument();
    });

    it('renders all three admin cards, with real data, for an admin', async () => {
      await renderCentre({
        isAdmin: true,
        adminPressure: {
          projects: [{ key: 'proj_a', name: 'proj_a', spend: 12 }],
          ceiling: 100,
          status: 'ready',
          onRetry: vi.fn(),
          note: 'scope note',
        },
        adminHygiene: {
          hygiene: {
            expiringCount: 0,
            expiringInDays: 30,
            neverUsedCount: 0,
            revokedRetainedCount: 0,
          },
          summary: '6 active keys',
        },
        refillRequestStatus: { pendingCount: 2, submittedLabel: 'oldest submitted 3 days ago' },
      });

      expect(screen.getByText('Budget pressure')).toBeInTheDocument();
      expect(screen.getByText('Key hygiene')).toBeInTheDocument();
      expect(screen.getByText('Refill requests')).toBeInTheDocument();
      expect(screen.getByText(/2 pending/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Review →' })).toHaveAttribute('href', '/admin');
    });

    it('omits the Refill requests card when nothing is pending, even for an admin', async () => {
      await renderCentre({ isAdmin: true, refillRequestStatus: undefined });

      expect(screen.queryByText('Refill requests')).not.toBeInTheDocument();
    });
  });
});
