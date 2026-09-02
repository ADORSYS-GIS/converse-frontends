import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Repository } from '../lib/domain/repos';
import type { ApiResult } from '../lib/server/api';
import { RepositoryOverviewCentre } from './repository-overview-centre';

const NOW = Date.UTC(2026, 7, 15, 12, 0, 0);

function baseRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 81,
    platform_repo_id: 5000081,
    platform: 'gitlab',
    owner: 'platform-team',
    name: 'platform-team-repo-21',
    default_branch: 'main',
    status: 'approved',
    active: true,
    approved_at: '2026-06-11T13:00:00Z',
    approved_by: 'dev',
    task_count: 3,
    last_task_at: new Date(NOW - 86_400_000 * 21).toISOString(),
    ...overrides,
  };
}

describe('RepositoryOverviewCentre', () => {
  it('a FAILED repository query renders an error line, never fabricated facts', () => {
    render(
      <RepositoryOverviewCentre
        result={{ ok: false, reason: 'unavailable' } as ApiResult<Repository | null>}
        now={NOW}
        grafanaConfigured={false}
      />
    );

    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
    expect(screen.queryByText('Repository')).not.toBeInTheDocument();
  });

  it('renders nothing for a not-found repository (ok, null data)', () => {
    const { container } = render(
      <RepositoryOverviewCentre
        result={{ ok: true, data: null }}
        now={NOW}
        grafanaConfigured={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the real repository facts', () => {
    render(
      <RepositoryOverviewCentre
        result={{ ok: true, data: baseRepo() }}
        now={NOW}
        grafanaConfigured={false}
      />
    );

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('GitLab')).toBeInTheDocument();
    expect(screen.getByText('3 runs')).toBeInTheDocument();
    expect(screen.getByText('dev')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '3 runs' })).toHaveAttribute('href', '/runs?repo=81');
  });

  it('renders "Never" for last run and "—" for approver when the repo has neither', () => {
    render(
      <RepositoryOverviewCentre
        result={{
          ok: true,
          data: baseRepo({ last_task_at: null, approved_by: null, approved_at: null }),
        }}
        now={NOW}
        grafanaConfigured={false}
      />
    );

    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows the honest unconfigured-Grafana message when NEXT_PUBLIC_GRAFANA_URL is unset', () => {
    render(
      <RepositoryOverviewCentre
        result={{ ok: true, data: baseRepo() }}
        now={NOW}
        grafanaConfigured={false}
      />
    );

    expect(screen.getByText('NEXT_PUBLIC_GRAFANA_URL')).toBeInTheDocument();
  });

  it('shows the not-yet-wired message when Grafana is configured, rather than a fake chart', () => {
    render(
      <RepositoryOverviewCentre
        result={{ ok: true, data: baseRepo() }}
        now={NOW}
        grafanaConfigured={true}
      />
    );

    expect(
      screen.getByText('Grafana embed configured, panel wiring not ported yet.')
    ).toBeInTheDocument();
  });
});
