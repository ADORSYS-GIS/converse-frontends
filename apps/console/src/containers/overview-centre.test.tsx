import { render, screen, within } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { OverviewScreen as OverviewScreenData } from './use-overview-screen';

/**
 * Container-level acceptance coverage for the story's own governing principle (Story 4.2 /
 * #300, extended to LATENCY by the `feat/usage-latency-percentiles` backend contract): a panel
 * with real data shows real data; a panel whose query FAILED must never fall back to `0` or to a
 * confirmed-empty rendering; and now that LATENCY is wired too, a GROUP within an otherwise
 * successful query that genuinely reported no latency says so per-series (the `latencyFootnote`),
 * never through `ErrorLine` (that mixing is console-ui#325's own fixed anti-pattern) and never by
 * fabricating a shape for it.
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
    scopeAccountLabel: 'acct_1',
    scopeProjectLabel: 'All projects',
    subline: 'acct_1 · last 30d · UTC',
    statCards: [],
    statCardsLoading: false,
    selectedSeriesKey: null,
    setSelectedSeriesKey: vi.fn(),
    rangeField: { label: 'Range', value: '30d', options: [], onChange: vi.fn() },
    bucketField: { label: 'Bucket', value: 'day', options: [], onChange: vi.fn() },
    groupByField: { label: 'Group by', value: 'project', options: [], onChange: vi.fn() },
    accountField: { label: 'Account', value: 'acct_1', options: [], onChange: vi.fn() },
    projectField: { label: 'Project', value: '', options: [], onChange: vi.fn() },
    modelField: { label: 'Model', value: 'all', options: [], onChange: vi.fn() },
    spendSeries: [],
    spendSlices: [],
    spendStatus: 'ready',
    spendErrorMessage: undefined,
    spendRetry: vi.fn(),
    latencySeries: [],
    latencyStatus: 'ready',
    latencyErrorMessage: undefined,
    latencyRetry: vi.fn(),
    latencyFootnote: undefined,
    budget: { status: 'unwired', caption: 'Budget figures arrive with the budget query wiring.' },
    refillAction: undefined,
    refillErrorMessage: undefined,
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
      // LATENCY is off the SAME query as SPEND in reality (`use-overview-screen.ts`'s
      // `latencyStatus` mirrors `spendStatus` exactly), so a real failed usage query takes both
      // down together -- matching that here also sidesteps a coincidental collision:
      // `LatencyRidgeline` shares `SpendSeriesChart`'s default empty wording ("No usage in this
      // range."), so leaving LATENCY `'ready'` with an empty series would make its OWN honest
      // empty state collide with the very string this test checks SPEND does not show.
      latencyStatus: 'error',
      latencyErrorMessage: 'The usage backend is unreachable right now.',
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes('unreachable'))).toBe(true);
    // The failed chart's own message is present -- not "No usage in this range." (which would
    // claim a completed, empty query) and not a fabricated series.
    expect(screen.queryByText('No usage in this range.')).not.toBeInTheDocument();
  });

  /**
   * The defect this guards: `OverviewCentre` passed NO `formatYTick`/`formatTooltipValue`/
   * `formatLegendValue` to `SpendDashboard` at all, so the chart fell back to its unit-agnostic
   * default (`String(Math.round(v))`). Against real production magnitudes — an account at
   * $0.006338 of a $12.00 ceiling — that labels every y-axis tick and every legend value `0`: no
   * currency sign, no magnitude, nothing.
   *
   * Asserted at the container, not the primitive, because the primitive is CORRECT to be
   * unit-blind (`LatencyDashboard` renders `ms` through the same props). The bug was only ever
   * "this container forgot to say these numbers are money", and only a container-level render can
   * see it.
   */
  it('renders real sub-cent spend as USD, never as the unit-blind default "0"', async () => {
    await renderCentre({
      spendStatus: 'ready',
      spendSeries: [
        { key: 'proj_a', label: 'proj_a', points: [{ x: new Date('2026-08-01'), y: 0.006338 }] },
        { key: 'proj_b', label: 'proj_b', points: [{ x: new Date('2026-08-01'), y: 0.000_12 }] },
      ],
      spendSlices: [
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

  it('renders LATENCY with real series when the usage query returned latency data', async () => {
    await renderCentre({
      latencyStatus: 'ready',
      latencySeries: [
        {
          key: 'gpt-4o-mini',
          label: 'gpt-4o-mini',
          values: [210, 240, 260],
          value: 'peak p95 260 ms',
        },
        {
          key: 'claude-sonnet',
          label: 'claude-sonnet',
          values: [900, 950],
          value: 'peak p95 950 ms',
        },
      ],
    });

    // The ridgeline renders each row's right-hand value -- the same "label left, p95 right"
    // contract `LatencyRidgelineSeries.value` documents, proving real data made it all the way
    // through rather than the chart falling back to an empty/unwired rendering.
    expect(screen.getByText('peak p95 260 ms')).toBeInTheDocument();
    expect(screen.getByText('peak p95 950 ms')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Not wired — see banner above.')).not.toBeInTheDocument();
  });

  it('a FAILED latency query renders an error line, independent of SPEND’s own status', async () => {
    await renderCentre({
      spendStatus: 'ready',
      latencyStatus: 'error',
      latencyErrorMessage: 'The usage backend is unreachable right now.',
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes('unreachable'))).toBe(true);
  });

  // The per-series honesty contract this whole story exists to build: some groups reported real
  // latency, one genuinely reported none (an aggregate-metric-only model) -- the footnote names
  // it explicitly rather than either fabricating a shape or blanking the whole panel.
  it('names the group(s) that reported no latency in a footnote when some, but not all, groups did', async () => {
    await renderCentre({
      latencyStatus: 'ready',
      latencySeries: [
        { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: [210, 240], value: 'peak p95 240 ms' },
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

    expect(
      screen.getByText(
        'No latency reported for signal-summary — aggregate metric signals carry a bucketed distribution, not a per-request duration.'
      )
    ).toBeInTheDocument();
  });

  // Every group reported zero samples this range -- the query still SUCCEEDED (never
  // `status="unwired"`, which would falsely claim the section was never queried at all), so the
  // empty ridgeline plus a footnote naming the range/filter itself is the honest rendering.
  it('names the whole range/filter in the footnote when every group reported no latency', async () => {
    await renderCentre({
      latencyStatus: 'ready',
      latencySeries: [
        { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: [], value: 'no latency reported' },
      ],
      latencyFootnote:
        'No latency reported for this range or filter — every event was either an aggregate metric signal or otherwise carried no per-request duration.',
    });

    expect(
      screen.getByText(
        'No latency reported for this range or filter — every event was either an aggregate metric signal or otherwise carried no per-request duration.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Not wired — see banner above.')).not.toBeInTheDocument();
  });

  it('renders no footnote at all when every group reported real latency', async () => {
    await renderCentre({
      latencyStatus: 'ready',
      latencySeries: [
        { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: [210, 240], value: 'peak p95 240 ms' },
      ],
      latencyFootnote: undefined,
    });

    expect(screen.queryByText(/No latency reported/)).not.toBeInTheDocument();
  });
});
