import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ResolvedSettings } from '../lib/server/admin';

/**
 * `repository-settings-actions.ts` is a Server Action module (reads the session cookie, calls the
 * control plane) — mocked wholesale, since this form calls it directly via `useTransition` (not
 * merely as a `<form action>` prop, unlike the approve/deny forms elsewhere), so a real toggle
 * click in this test genuinely invokes it.
 */
const setRepoSettingMock = vi.fn();
const clearRepoSettingMock = vi.fn();
vi.mock('./repository-settings-actions', () => ({
  setRepoSetting: (...args: unknown[]) => setRepoSettingMock(...args),
  clearRepoSetting: (...args: unknown[]) => clearRepoSettingMock(...args),
}));

const { RepoSettingsForm } = await import('./repo-settings-form');

function baseSettings(overrides: Partial<ResolvedSettings> = {}): ResolvedSettings {
  return {
    check_run_reporting: { value: true, source: 'default' },
    review_on_pr_open: { value: true, source: 'default' },
    review_on_push: { value: false, source: 'default' },
    push_strategy: { value: 'supersede', source: 'default' },
    push_debounce: { value: { secs: 60, nanos: 0 }, source: 'default' },
    dedup_scope: { value: 'pr', source: 'default' },
    ...overrides,
  };
}

describe('RepoSettingsForm', () => {
  it('renders each setting with its real provenance label', () => {
    render(
      <RepoSettingsForm
        id={81}
        settings={baseSettings({ check_run_reporting: { value: true, source: 'db' } })}
        canConfigure
      />
    );

    expect(screen.getByText('Admin override')).toBeInTheDocument();
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0);
  });

  it('disables every control when canConfigure is false', () => {
    render(<RepoSettingsForm id={81} settings={baseSettings()} canConfigure={false} />);

    expect(screen.getByLabelText('Check-run reporting')).toHaveAttribute('aria-disabled', 'true');
  });

  it('toggling a setting optimistically flips it to "Admin override" and calls setRepoSetting', async () => {
    setRepoSettingMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<RepoSettingsForm id={81} settings={baseSettings()} canConfigure />);

    await user.click(screen.getByLabelText('Check-run reporting'));

    expect(screen.getByLabelText('Check-run reporting')).not.toBeChecked();
    expect(await screen.findByText('Admin override')).toBeInTheDocument();
    expect(setRepoSettingMock).toHaveBeenCalledWith(81, { check_run_reporting: false });
  });

  it('a failed save surfaces the real error message from the action, not a generic one', async () => {
    setRepoSettingMock.mockResolvedValue({ ok: false, error: 'Failed to save the setting' });
    const user = userEvent.setup();
    render(<RepoSettingsForm id={81} settings={baseSettings()} canConfigure />);

    await user.click(screen.getByLabelText('Check-run reporting'));

    expect(await screen.findByText('Failed to save the setting')).toBeInTheDocument();
  });

  it('an admin-override row shows a Reset button that calls clearRepoSetting', async () => {
    clearRepoSettingMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <RepoSettingsForm
        id={81}
        settings={baseSettings({ check_run_reporting: { value: true, source: 'db' } })}
        canConfigure
      />
    );

    const resetButtons = screen.getAllByRole('button', { name: 'Reset' });
    expect(resetButtons).toHaveLength(1);
    await user.click(resetButtons[0]!);

    await waitFor(() =>
      expect(clearRepoSettingMock).toHaveBeenCalledWith(81, 'check_run_reporting')
    );
  });

  it('shows no Reset button for a setting still on its default or file value', () => {
    render(
      <RepoSettingsForm
        id={81}
        settings={baseSettings({ check_run_reporting: { value: true, source: 'file' } })}
        canConfigure
      />
    );

    // None of the six rows are on `db` in this fixture, so Reset never appears.
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('shows the debounce-window field only when the push strategy is "debounce"', () => {
    const { unmount } = render(
      <RepoSettingsForm
        id={81}
        settings={baseSettings({ push_strategy: { value: 'supersede', source: 'default' } })}
        canConfigure
      />
    );
    expect(screen.queryByLabelText('Debounce window')).not.toBeInTheDocument();
    unmount();

    render(
      <RepoSettingsForm
        id={81}
        settings={baseSettings({ push_strategy: { value: 'debounce', source: 'db' } })}
        canConfigure
      />
    );
    expect(screen.getByLabelText('Debounce window')).toBeInTheDocument();
  });
});
