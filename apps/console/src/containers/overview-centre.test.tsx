import { render, screen, within } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { OverviewScreen as OverviewScreenData } from './use-overview-screen';

/**
 * Container-level acceptance coverage for the story's own governing principle (Story 4.2 /
 * #300): a panel with real data shows real data; a panel whose query FAILED must never fall back
 * to `0` or to a confirmed-empty rendering; a capability that genuinely does not exist (LATENCY,
 * #307) says so, honestly, in place of a chart — never through `ErrorLine` (that mixing is
 * console-ui#325's own fixed anti-pattern).
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
    emptyMessage: "Latency distribution isn't available.",
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
    latencyMessage: "Latency distribution isn't available.",
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
  it('renders SPEND with real data when the usage query succeeded (status="ready")', async () => {
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
  });

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

  // #307 — this is the ticket's own acceptance surface: LATENCY renders its blocked state
  // regardless of the OTHER sections' status, and never through `ErrorLine` (console-ui#325's
  // fixed anti-pattern: a placeholder/non-outcome is `role="status"`, not `role="alert"`).
  it('LATENCY always renders the blocked message, never a drawn-empty or fabricated chart', async () => {
    await renderCentre({
      spendStatus: 'ready',
      emptyMessage: 'top banner: unrelated to the chart-level message below it',
      latencyMessage: "Blocked — the usage API doesn't report latency or percentile data yet.",
    });

    // Rendered by `LatencyDashboard` itself (inside its `<svg>`), distinct from the top banner.
    expect(
      screen.getByText("Blocked — the usage API doesn't report latency or percentile data yet.")
    ).toBeInTheDocument();
  });

  it('the Overview banner no longer claims spend/budget are unwired once they are wired', async () => {
    await renderCentre({ emptyMessage: "Latency distribution isn't available." });

    expect(screen.queryByText(/no usage-backend query client/i)).not.toBeInTheDocument();
  });
});
