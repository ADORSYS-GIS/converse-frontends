'use client';

import type { Project } from '@lightbridge/authz-rpc';
import type { ProjectNameDialogProps } from '@lightbridge/ui-web/src/components/project-name-dialog';
import type {
  ProjectSettingsProps,
  ProjectSettingsRow,
} from '@lightbridge/ui-web/src/sections/project-settings';
import { useList } from '@refinedev/core';
import { useMemo, useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { SETTINGS_DIALOG_OPTIONS, useSettingsParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { accountScopeLabel } from './account-label';
import { toProjectSettingsRows } from './project-settings-rows';
import { classifyProjectNameError } from './rpc-field-error';

/**
 * `/settings/projects` — the project-identity screen's data adapter. The sibling of
 * `use-account-settings-screen.ts` (see that file's own doc comment for why the split happened);
 * this hook owns the project-rename half — search + `Pagination` (10/page) over the scoped
 * account's projects, and the per-row rename write.
 *
 * The unbounded N×7 project dump this screen used to render (every project's full fact column,
 * one after another, with nothing to page through) died the moment an account holds more than a
 * handful of projects — `search`/`page` (`?q=`/`?page=`, `settingsParsers`) are the same idiom
 * `apiKeysParsers`/`manageParsers` already use for their own ledgers.
 */

const PAGE_SIZE = 10;

/**
 * The `DetailSheet` a project row's click opens (phase 9, Addition C). `Rename` is the sheet's
 * OWN action now — it targets whichever project is open, not a per-row button — so this carries
 * the same eligibility pair `renameDisabled`/`renameReason` used to sit on `ProjectSettingsProps`.
 */
export interface ProjectSettingsDetailScreen {
  open: boolean;
  project: ProjectSettingsRow | null;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  renameDisabled: boolean;
  renameReason: string | undefined;
}

export interface ProjectSettingsScreen {
  /** The scoped account's display label (`accountScopeLabel`), for `PageHeader.subtitle`. */
  scopeLabel: string | undefined;
  projectSettings: ProjectSettingsProps;
  projectDetail: ProjectSettingsDetailScreen;
  projectNameDialog: ProjectNameDialogProps;
  /** The account's TOTAL project count (unfiltered by search), for `SettingsSubNav`'s
   *  `Projects` tab. */
  projectCount: number;
}

/** One key for every project rename: only one rename dialog can be open at a time (`?rename=` is
 *  a single id), so a second rename cannot overlap the first. */
const PROJECT_NAME_MUTATION_KEY = ['settings', 'project-name'];

export function useProjectSettingsScreen(): ProjectSettingsScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
  const [view, setView] = useSettingsParams();

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.accountId) {
      active.push({ field: 'accountId', operator: 'eq' as const, value: scope.value.accountId });
    }
    if (view.search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: view.search.trim() });
    }
    return active;
  }, [scope.value.accountId, view.search]);

  const list = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: view.page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: 'name', order: 'asc' }],
  });

  // Live findings #1 (2026-08-30) — the false-empty flash: see `use-projects-screen.ts`'s own
  // doc comment on its identical `loading` computation. `scope.value.accountId` starts `''` until
  // `useConsoleScope()`'s accounts list resolves, so the `filters` above can compute WITHOUT an
  // `accountId` clause for a render or two — a genuinely different, wrongly-unscoped query that
  // can settle empty before the correctly-scoped one replaces it. Gating on `scope.loading` too
  // keeps the skeleton up until the account scope itself is known.
  const loading = list.query.isLoading || scope.loading;

  const projects = list.result.data;
  const rows = useMemo(() => toProjectSettingsRows(projects), [projects]);
  const total = list.result.total ?? rows.length;

  // Retries the genuine failed fetch AND refreshes the list after a real write.
  const refresh = () => {
    void list.query.refetch();
  };

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — same clause `use-account-settings-screen.ts`
   * documents): the project rename dialog's typed-but-unsent name. `?rename=true` — WHETHER the
   * dialog is open — is real view state and lives in the URL; the half-typed replacement name is
   * not.
   */
  const [projectNameDraft, setProjectNameDraft] = useState('');

  /**
   * Presentation-only mirror of `model.Project.update`'s `@@allow` gate (`authz.cstack` —
   * `account.id == auth().id || members.some.accountId == auth().id`). The real enforcement is
   * `lightbridge-authz`'s own RBAC check; this only avoids offering a control that would fail.
   */
  let renameEligible: boolean;
  let renameReason: string | undefined;
  if (!scope.value.accountId) {
    renameEligible = false;
    renameReason = 'Select an account to change its project settings.';
  } else if (!session.user) {
    renameEligible = false;
    renameReason = 'Sign in to change project settings.';
  } else if (session.user.sub !== scope.value.accountId) {
    renameEligible = false;
    renameReason = 'Only the account owner or a project member can rename a project.';
  } else {
    renameEligible = true;
    renameReason = undefined;
  }

  // Phase 9 (Addition C) split what used to be one `?rename=<id>` param in two: `renameProjectId`
  // (wire key `row`) is the project `DetailSheet` has open — a SELECTION, from clicking a row —
  // and `projectNameOpen` (wire key `rename`) is whether the rename dialog is stacked on top of
  // it, targeting the same id. A link to an open sheet reopens on that project; Back closes
  // whichever of the two is open, innermost first, instead of leaving the screen.
  const selectedProject = rows.find((row) => row.id === view.renameProjectId) ?? null;
  const renameTarget = view.projectNameOpen ? selectedProject : null;

  const projectAction = useSharedMutation<{ id: string; name: string }, Project>({
    mutationKey: PROJECT_NAME_MUTATION_KEY,
    mutationFn: async ({ id, name }) => {
      if (!id) throw new Error('Choose a project before renaming it.');
      if (!name.trim()) throw new Error('Name the project before saving.');
      // `model.Project.update` is the generic verb, and `name` is the ONE field on `Project` it
      // can actually affect: every other column is `@readonly` with its own procedure.
      return client.projects.update(id, { name: name.trim() });
    },
    onSuccess: () => {
      refresh();
      // The scope hook's own project list feeds the header/scope selector, so it is stale too.
      scope.refetch();
      setProjectNameDraft('');
      // Only the rename dialog closes — the sheet stays open and shows the refreshed name.
      void setView({ projectNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  });

  const projectFieldErrors = projectAction.errorMessage
    ? classifyProjectNameError(projectAction.errorMessage)
    : {};

  const canSubmitProjectName =
    renameTarget !== null &&
    projectNameDraft.trim().length > 0 &&
    projectNameDraft.trim() !== renameTarget.name;

  const projectSettings: ProjectSettingsProps = {
    projects: rows,
    loading,
    loadingRowCount: 3,
    error: list.query.isError ? 'Could not load projects.' : undefined,
    onRetry: refresh,
    search: view.search,
    onSearchChange: (search) => {
      void setView({ search, page: 1 });
    },
    filteredEmptyMessage: view.search.trim()
      ? `No projects match “${view.search.trim()}”.`
      : undefined,
    pagination: {
      shown: rows.length,
      total,
      hasPrev: view.page > 1,
      hasNext: view.page * PAGE_SIZE < total,
      onPrev: () => void setView({ page: Math.max(1, view.page - 1) }),
      onNext: () => void setView({ page: view.page + 1 }),
    },
    onSelectRow: (project: ProjectSettingsRow) => {
      void setView({ renameProjectId: project.id, projectNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
    selectedProjectId: view.renameProjectId || undefined,
  };

  const projectDetail: ProjectSettingsDetailScreen = {
    open: selectedProject !== null,
    project: selectedProject,
    onOpenChange: (open) => {
      if (!open) void setView({ renameProjectId: '', projectNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
    onRename: () => {
      if (!renameEligible || selectedProject === null) return;
      if (projectAction.errorMessage) projectAction.dismiss();
      setProjectNameDraft(selectedProject.name);
      void setView({ projectNameOpen: true }, SETTINGS_DIALOG_OPTIONS);
    },
    renameDisabled: !renameEligible,
    renameReason,
  };

  const projectNameDialog: ProjectNameDialogProps = {
    open: renameTarget !== null,
    projectId: renameTarget?.id ?? '',
    currentName: renameTarget?.name ?? '',
    name: projectNameDraft,
    onNameChange: setProjectNameDraft,
    nameError: projectFieldErrors.nameError,
    submitting: projectAction.isPending,
    error: projectFieldErrors.error,
    canSubmit: canSubmitProjectName,
    onSubmit: () => {
      if (!canSubmitProjectName || renameTarget === null) return;
      projectAction.mutate({ id: renameTarget.id, name: projectNameDraft });
    },
    onCancel: () => {
      if (projectAction.errorMessage) projectAction.dismiss();
      setProjectNameDraft('');
      void setView({ projectNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  };

  const activeAccount = scope.allAccounts.find((account) => account.id === scope.value.accountId);

  return {
    scopeLabel: activeAccount ? accountScopeLabel(activeAccount) : undefined,
    projectSettings,
    projectDetail,
    projectNameDialog,
    projectCount: total,
  };
}
