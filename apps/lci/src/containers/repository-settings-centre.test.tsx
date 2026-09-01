import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ResolvedSettings } from '../lib/server/admin';
import type { ApiResult } from '../lib/server/api';

// `RepoSettingsForm` has its own dedicated interaction coverage (`repo-settings-form.test.tsx`) —
// stubbed here so this file stays focused on the centre's own gating (error line, read-only
// banner) rather than re-exercising every setting row.
vi.mock('./repo-settings-form', () => ({
  RepoSettingsForm: ({ id, canConfigure }: { id: number; canConfigure: boolean }) => (
    <div data-testid="repo-settings-form">
      form for repo {id}, canConfigure={String(canConfigure)}
    </div>
  ),
}));

const { RepositorySettingsCentre } = await import('./repository-settings-centre');

function baseSettings(): ResolvedSettings {
  return {
    check_run_reporting: { value: true, source: 'default' },
    review_on_pr_open: { value: true, source: 'default' },
    review_on_push: { value: false, source: 'default' },
    push_strategy: { value: 'supersede', source: 'default' },
    push_debounce: { value: { secs: 60, nanos: 0 }, source: 'default' },
    dedup_scope: { value: 'pr', source: 'default' },
  };
}

describe('RepositorySettingsCentre', () => {
  it('a FAILED settings query renders an error line, never a fabricated form', () => {
    render(
      <RepositorySettingsCentre
        id={81}
        result={{ ok: false, reason: 'unavailable' } as ApiResult<{ settings: ResolvedSettings }>}
        canConfigure={false}
      />
    );

    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
    expect(screen.queryByTestId('repo-settings-form')).not.toBeInTheDocument();
  });

  it('shows the read-only banner and passes canConfigure=false through when unauthorized', () => {
    render(
      <RepositorySettingsCentre
        id={81}
        result={{ ok: true, data: { settings: baseSettings() } }}
        canConfigure={false}
      />
    );

    expect(
      screen.getByText("Read-only — you don't have repo:configure permission.")
    ).toBeInTheDocument();
    expect(screen.getByTestId('repo-settings-form')).toHaveTextContent('canConfigure=false');
  });

  it('shows no read-only banner, and passes canConfigure=true, when authorized', () => {
    render(
      <RepositorySettingsCentre
        id={81}
        result={{ ok: true, data: { settings: baseSettings() } }}
        canConfigure={true}
      />
    );

    expect(
      screen.queryByText("Read-only — you don't have repo:configure permission.")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('repo-settings-form')).toHaveTextContent('canConfigure=true');
    expect(screen.getByTestId('repo-settings-form')).toHaveTextContent('form for repo 81');
  });
});
