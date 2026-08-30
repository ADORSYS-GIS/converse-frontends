import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { SettingsOverviewScreen as SettingsOverviewScreenData } from './use-settings-overview-screen';

/**
 * Container-level acceptance coverage, same split `overview-centre.test.tsx` uses:
 * `useSettingsOverviewScreen` is mocked wholesale (its own request/response mapping is covered by
 * `settings-overview-usage.test.ts`'s pure-function tests) so this file checks a black-box
 * question — given a `status`/`lens`, does the centre render the corresponding honest shape.
 *
 * The BUDGET PRESSURE / KEY HYGIENE coverage below MOVED here from `overview-centre.test.tsx`
 * (IA v3 phase 4, build brief §7 — "`/` becomes purely the account-scoped user dashboard"): the
 * cards themselves moved from `/` to the project lens (pressure) and the account lens (hygiene),
 * so their acceptance tests move with them rather than staying behind to test a screen that no
 * longer renders them.
 */
const useSettingsOverviewScreenMock = vi.fn();
vi.mock('./use-settings-overview-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-settings-overview-screen')>();
  return {
    ...actual,
    useSettingsOverviewScreen: () => useSettingsOverviewScreenMock(),
  };
});

function baseScreen(
  overrides: Partial<SettingsOverviewScreenData> = {}
): SettingsOverviewScreenData {
  return {
    lens: 'account',
    title: 'Account overview',
    subtitle: 'adorsys-gis',
    ready: true,
    rangeField: {
      label: 'Range',
      preset: '30d',
      presets: [{ value: '30d', label: 'Last 30 days', days: 30 }],
      value: { from: new Date(Date.UTC(2026, 6, 31)), to: new Date(Date.UTC(2026, 7, 29)) },
      onPresetChange: vi.fn(),
      onRangeChange: vi.fn(),
    },
    projectField: undefined,
    statCards: [],
    statCardsLoading: false,
    spendSeries: [],
    spendStatus: 'ready',
    spendErrorMessage: undefined,
    spendRetry: vi.fn(),
    spendTruncated: false,
    modelRows: [],
    modelRowsStatus: 'ready',
    modelRowsErrorMessage: undefined,
    modelRowsRetry: vi.fn(),
    selectedSeriesKey: null,
    setSelectedSeriesKey: vi.fn(),
    secondary: undefined,
    latencyRows: [],
    latencyStatus: 'ready',
    burnDown: undefined,
    // Admin-only, role- AND lens-parameterised — defaults to neither, never a permanently-loading
    // placeholder (see `use-settings-overview-screen.ts`'s own doc comment).
    adminPressure: undefined,
    adminHygiene: undefined,
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<SettingsOverviewScreenData> = {}) {
  useSettingsOverviewScreenMock.mockReturnValue(baseScreen(overrides));
  const { SettingsOverviewCentre } = await import('./settings-overview-centre');
  return render(<SettingsOverviewCentre lens={overrides.lens ?? 'account'} />, {
    wrapper: withNuqsTestingAdapter(),
  });
}

describe('SettingsOverviewCentre', () => {
  it('renders the stat row and spend chart for a ready screen', async () => {
    await renderCentre({
      statCards: [{ key: 'cost', label: 'Cost', metric: '$42.00' }],
    });

    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('$42.00')).toBeInTheDocument();
  });

  it('renders an inline status instead of the dashboard while not ready (project lens, no project scoped)', async () => {
    await renderCentre({ lens: 'project', ready: false });

    expect(screen.getByText('Select a project above to see its usage.')).toBeInTheDocument();
    expect(screen.queryByText('Latency by model')).not.toBeInTheDocument();
  });

  // Build brief finish-item §2: a degenerate (<=1 distinct value) secondary breakdown renders an
  // inline status in place of the ranked list, on EITHER lens that carries one.
  it('renders the secondary breakdown\'s gatedMessage instead of RankedSeriesRows when set', async () => {
    await renderCentre({
      lens: 'account',
      secondary: {
        label: 'Spend by project',
        rows: [],
        status: 'ready',
        onRetry: vi.fn(),
        unassignedCaption: null,
        gatedMessage: 'Only one project in this window (gateway-prod).',
      },
    });

    expect(screen.getByText('Only one project in this window (gateway-prod).')).toBeInTheDocument();
  });

  it('renders the real ranked rows when the secondary breakdown clears its gate', async () => {
    await renderCentre({
      lens: 'project',
      secondary: {
        label: 'Spend by API key',
        rows: [
          { key: 'key_a', label: 'key-a', value: 4, formattedValue: '$4.00' },
          { key: 'key_b', label: 'key-b', value: 2, formattedValue: '$2.00' },
        ],
        status: 'ready',
        onRetry: vi.fn(),
        unassignedCaption: null,
        gatedMessage: undefined,
      },
    });

    expect(screen.getByText('key-a')).toBeInTheDocument();
    expect(screen.getByText('key-b')).toBeInTheDocument();
  });

  describe('the admin-only cards — moved from `/`', () => {
    it('renders neither admin card for a non-admin, on any lens', async () => {
      await renderCentre({ lens: 'account', adminPressure: undefined, adminHygiene: undefined });

      expect(screen.queryByText('Budget pressure')).not.toBeInTheDocument();
      expect(screen.queryByText('Key hygiene')).not.toBeInTheDocument();
    });

    it('renders Budget pressure with real data on the PROJECT lens for an admin', async () => {
      await renderCentre({
        lens: 'project',
        adminPressure: {
          projects: [{ key: 'proj_a', name: 'proj_a', spend: 12 }],
          ceiling: 100,
          status: 'ready',
          onRetry: vi.fn(),
          note: 'scope note',
        },
      });

      expect(screen.getByText('Budget pressure')).toBeInTheDocument();
      expect(screen.getByText('proj_a')).toBeInTheDocument();
      // Key hygiene is the ACCOUNT lens' own card — never rendered here.
      expect(screen.queryByText('Key hygiene')).not.toBeInTheDocument();
    });

    it('renders Key hygiene with real data on the ACCOUNT lens for an admin', async () => {
      await renderCentre({
        lens: 'account',
        adminHygiene: {
          hygiene: {
            expiringCount: 0,
            expiringInDays: 30,
            neverUsedCount: 0,
            revokedRetainedCount: 0,
          },
          summary: '6 active keys',
        },
      });

      expect(screen.getByText('Key hygiene')).toBeInTheDocument();
      expect(screen.getByText('6 active keys')).toBeInTheDocument();
      // Budget pressure is the PROJECT lens' own card — never rendered here.
      expect(screen.queryByText('Budget pressure')).not.toBeInTheDocument();
    });

    it('states the key-listing truncation caveat when the screen reports one', async () => {
      await renderCentre({
        lens: 'account',
        adminHygiene: {
          hygiene: {
            expiringCount: 0,
            expiringInDays: 30,
            neverUsedCount: 0,
            revokedRetainedCount: 0,
          },
          summary: '100 active keys',
          caveat: 'Counted over the first 100 of 140 keys in this account — the rest are beyond this page.',
        },
      });

      expect(
        screen.getByText(/Counted over the first 100 of 140 keys/)
      ).toBeInTheDocument();
    });
  });
});
