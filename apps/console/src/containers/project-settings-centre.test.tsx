import React from 'react';
import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectSettingsScreen as ProjectSettingsScreenData } from './use-project-settings-screen';

/**
 * Container-level acceptance coverage for `/settings/projects` — the project-identity half of
 * the screen the account flow moved to, now its own real route (phase 6, admin/settings revamp).
 *
 * `useProjectSettingsScreen` is mocked wholesale, matching every other `*-centre.test.tsx` in
 * this app. `next/navigation`/`next/link` are mocked for the same reason
 * `account-settings-centre.test.tsx` mocks them — see that file's own comment.
 */
vi.mock('next/navigation', () => ({ usePathname: () => '/settings/projects' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const useProjectSettingsScreenMock = vi.fn();
vi.mock('./use-project-settings-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-project-settings-screen')>();
  return {
    ...actual,
    useProjectSettingsScreen: () => useProjectSettingsScreenMock(),
  };
});

const gatewayProd = {
  id: 'proj_7f21',
  name: 'gateway-prod',
  billingIdentity: 'adorsys-gis/gateway',
  billingPlan: 'pro',
  quotaTier: 'scale',
  modelPolicy: 'allow_all',
  status: 'active',
  isDefault: true,
};

function baseScreen(overrides: Partial<ProjectSettingsScreenData> = {}): ProjectSettingsScreenData {
  return {
    scopeLabel: 'Widgets Ltd',
    projectSettings: {
      projects: [gatewayProd],
      loading: false,
      search: '',
      onSearchChange: vi.fn(),
      onSelectRow: vi.fn(),
      onRetry: vi.fn(),
    },
    projectDetail: {
      open: false,
      project: null,
      onOpenChange: vi.fn(),
      onRename: vi.fn(),
      renameDisabled: false,
      renameReason: undefined,
    },
    projectNameDialog: {
      open: false,
      projectId: 'proj_7f21',
      currentName: 'gateway-prod',
      name: 'gateway-prod',
      onNameChange: vi.fn(),
      submitting: false,
      canSubmit: false,
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    },
    projectCount: 1,
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<ProjectSettingsScreenData> = {}) {
  useProjectSettingsScreenMock.mockReturnValue(baseScreen(overrides));
  const { ProjectSettingsCentre } = await import('./project-settings-centre');
  return render(<ProjectSettingsCentre />, { wrapper: withNuqsTestingAdapter() });
}

describe('ProjectSettingsCentre', () => {
  it('renders one summary row per project — name and a status/tier line', async () => {
    await renderCentre();

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('active · scale')).toBeInTheDocument();
  });

  it('opens the DetailSheet with the project’s full field list and a Rename action in the footer', async () => {
    await renderCentre({
      projectDetail: {
        open: true,
        project: gatewayProd,
        onOpenChange: vi.fn(),
        onRename: vi.fn(),
        renameDisabled: false,
        renameReason: undefined,
      },
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('gateway-prod');
    expect(screen.getByText('Billing identity')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis/gateway')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('opens the rename dialog on the project the URL names', async () => {
    await renderCentre({
      projectNameDialog: {
        open: true,
        projectId: 'proj_7f21',
        currentName: 'gateway-prod',
        name: 'gateway-prod',
        onNameChange: vi.fn(),
        submitting: false,
        canSubmit: false,
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const dialogs = await screen.findAllByRole('dialog');
    const renameDialog = dialogs.find((dialog) => dialog.textContent?.includes('proj_7f21'));
    expect(renameDialog).toHaveAccessibleName('Rename project');
  });

  it('carries a real search box — this is a browsable, paginated list now', async () => {
    await renderCentre();

    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders a real, clickable pagination row when the container wires a further page', async () => {
    const onNext = vi.fn();
    await renderCentre({
      projectSettings: {
        ...baseScreen().projectSettings,
        pagination: { shown: 1, total: 24, hasPrev: false, hasNext: true, onNext },
      },
    });

    expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled();
  });

  it('renders the Account/Projects tab row, Projects active, carrying the project count', async () => {
    await renderCentre({ projectCount: 24 });

    const projectsTab = screen.getByRole('link', { name: 'Projects 24' });
    expect(projectsTab).toHaveAttribute('aria-current', 'page');
    const accountTab = screen.getByRole('link', { name: 'Account' });
    expect(accountTab).toHaveAttribute('href', '/settings/account');
    expect(accountTab).not.toHaveAttribute('aria-current');
  });

  it('scopes the page subtitle to the account label only — no stale IA-explainer sentence', async () => {
    await renderCentre();

    expect(screen.queryByText(/Filtering and browsing live on Manage/)).not.toBeInTheDocument();
  });

  /**
   * Live findings #1 (2026-08-30) — the same false-empty flash `use-projects-screen.ts` had:
   * `use-project-settings-screen.ts`'s `projectSettings.loading` is now `list.query.isLoading ||
   * scope.loading`, so a still-resolving account scope keeps this on skeleton rows rather than
   * flashing "No projects in this account yet." for an account that, moments later, turns out to
   * have projects.
   */
  it('renders skeleton rows, never the empty message, while still loading with zero rows so far', async () => {
    await renderCentre({
      projectSettings: { ...baseScreen().projectSettings, projects: [], loading: true },
    });

    expect(screen.queryByText('No projects in this account yet.')).not.toBeInTheDocument();
    // The search field renders immediately — only the list body is a skeleton.
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders the empty message only once the list has genuinely settled with zero rows', async () => {
    await renderCentre({
      projectSettings: { ...baseScreen().projectSettings, projects: [], loading: false },
    });

    expect(screen.getByText('No projects in this account yet.')).toBeInTheDocument();
  });
});
