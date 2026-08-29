import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

/**
 * `/admin` is ONE route with two sections behind ONE nav entry — the operator overview it lands on
 * and the budget refill queue — switched by `?section=` rather than by a second top-level nav item
 * or a second URL segment.
 *
 * Three properties, and each has a specific way of going wrong:
 *
 *  1. A bare `/admin` lands on the OVERVIEW. `section` defaults to `'overview'` and
 *     `clearOnDefault` keeps it out of the URL, so "no param" and "overview" must be the same
 *     thing — a centre that fell through to the review queue when the param was absent would make
 *     the landing section unreachable without a query string.
 *  2. `?section=refills` still reaches the queue, unchanged. Adding a section must not cost the
 *     one that already shipped.
 *  3. The RIGHT RAIL follows the section, not the route. Only the queue is selection-driven; the
 *     dashboard is a toolbar screen, and a rail slot that rendered its review panel there would
 *     put "Select a request to review it." beside a dashboard with no requests in it.
 *
 * The two screen adapters are mocked: what is under test is the section SWITCH, not the data.
 */
vi.mock('./use-admin-screen', () => ({
  useAdminScreen: () => ({
    activeTab: 'pending',
    setActiveTab: vi.fn(),
    pending: [],
    decisions: [],
    pendingCount: 0,
    decidedCount: 0,
    loading: false,
    errorMessage: undefined,
    emptyPendingMessage: 'Nothing awaiting a decision.',
    retry: vi.fn(),
    selectedRequestId: null,
    selectRequest: vi.fn(),
    reviewDetail: null,
    pagination: { shown: 0, hasNext: false },
    decidedSourceCaveat: 'caveat',
  }),
}));

vi.mock('./admin-overview-centre', () => ({
  AdminOverviewCentre: () => <div data-testid="admin-overview" />,
}));

async function renderCentre(searchParams: string) {
  const { AdminCentre } = await import('./admin-centre');
  return render(<AdminCentre />, { wrapper: withNuqsTestingAdapter({ searchParams }) });
}

async function renderRail(searchParams: string) {
  const { AdminRail } = await import('./admin-rail');
  return render(<AdminRail />, { wrapper: withNuqsTestingAdapter({ searchParams }) });
}

describe('the /admin sections', () => {
  it('lands on the operator overview when no section is in the URL', async () => {
    await renderCentre('');

    expect(screen.getByTestId('admin-overview')).toBeInTheDocument();
    expect(screen.queryByText('Budget refill review')).not.toBeInTheDocument();
  });

  it('still reaches the refill review queue at ?section=refills', async () => {
    await renderCentre('?section=refills');

    expect(screen.getByText('Budget refill review')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-overview')).not.toBeInTheDocument();
  });

  it('falls back to the landing section on a retired section value', async () => {
    await renderCentre('?section=org-config');

    expect(screen.getByTestId('admin-overview')).toBeInTheDocument();
  });

  it('renders no right rail on the overview section', async () => {
    const { container } = await renderRail('');

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the selection-driven review rail on the refills section', async () => {
    await renderRail('?section=refills');

    expect(screen.getByText(/Select a request/i)).toBeInTheDocument();
  });
});
