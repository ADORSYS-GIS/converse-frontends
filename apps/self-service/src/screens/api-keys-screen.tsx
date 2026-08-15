import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  useAllAccounts,
  useAllProjects,
  useApiKeys,
  usePagination,
  usePermissions,
  useQueryState,
} from '@lightbridge/hooks';
import type { Account, Project } from '@lightbridge/hooks';
import { Pagination } from '@lightbridge/ui';
import { useSheet } from '@lightbridge/ui/sheet';
import {
  pickerTruncationNotice,
  toAccountPickerOptions,
  toProjectPickerOptions,
} from '../components/entity-picker-field';
import { usePickerSheet } from '../hooks/use-picker-sheet';
import { useThemeColors } from '../hooks/use-theme-colors';
import { ApiKeysListView } from '../views/api-keys-list-view';
import { DeleteApiKeySheet } from './delete-api-key-sheet';
import { RevokeApiKeySheet } from './revoke-api-key-sheet';
import { RotateApiKeySheet } from './rotate-api-key-sheet';

const PAGE_SIZE = 10;

export function ApiKeysScreen() {
  const { t } = useTranslation();
  const sheet = useSheet();
  const openPicker = usePickerSheet();
  const colors = useThemeColors();
  const { has } = usePermissions();
  // Account/project selection lives in the URL (?accountId=…&projectId=…) so it
  // survives refresh and deep-links, read straight through useQueryState — no
  // useLocalSearchParams + useState + useEffect sync dance.
  const [accountParam, setAccountParam] = useQueryState('accountId');
  const [projectParam, setProjectParam] = useQueryState('projectId');
  const router = useRouter();
  // Full lists (every page, not the first `limit: 10`) — these feed the account/project picker,
  // which needs the complete set to search/select over. See useAllAccounts/useAllProjects in
  // @lightbridge/hooks for why the plain `useAccounts`/`useProjects` (capped at one page) are the
  // wrong fit here.
  const {
    data: accountsData = [],
    isLoading: isAccountsLoading,
    totalCount: accountsTotalCount,
  } = useAllAccounts();
  const accounts: Account[] = accountsData;

  // Effective account: the URL param when set, otherwise the first account.
  const accountId = accountParam ?? accounts[0]?.id;
  const {
    data: projectsData = [],
    isLoading: isProjectsLoading,
    totalCount: projectsTotalCount,
  } = useAllProjects(accountId);
  const projects: Project[] = projectsData;

  // Effective project: the URL param when it belongs to the current account's
  // projects, otherwise the first project (so switching account falls back
  // cleanly even while a stale ?projectId lingers in the URL).
  const projectParamInList = projects.some((project) => project.id === projectParam);
  const projectId = (projectParamInList ? projectParam : undefined) ?? projects[0]?.id;

  // Server-driven offset pagination — real Next/Prev over the backend list, not an
  // in-memory re-slice of a fixed first page.
  const pagination = usePagination({ pageSize: PAGE_SIZE });

  // Land back on page 1 whenever the selected account or project changes, or the
  // user could land on a stale page N of a different project's list.
  useEffect(() => {
    pagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, projectId]);

  const { data: items = [], isLoading: isKeysLoading } = useApiKeys(projectId, {
    offset: pagination.offset,
    limit: pagination.limit,
  });

  // The backend returns a bare array with no total-count, so `hasMore` is the
  // documented length-vs-limit heuristic from usePagination, not an exact count.
  const hasMoreItems = pagination.hasMore(items.length);

  const handleSelectAccount = (id: string) => {
    setAccountParam(id);
    setProjectParam(null);
  };

  const handleSelectProject = (id: string) => {
    setProjectParam(id);
  };

  const accountOptions = toAccountPickerOptions(accounts);
  const projectOptions = toProjectPickerOptions(projects, projectId, colors);

  const handleOpenAccountPicker = () => {
    openPicker({
      options: accountOptions,
      selectedId: accountId,
      onSelect: handleSelectAccount,
      searchPlaceholder: t('picker.searchAccounts'),
      noResultsLabel: t('picker.noResults'),
      title: t('picker.selectAccount'),
      resultCountLabel: t('picker.accountCount', { count: accountOptions.length }),
      optionAccessibilityLabel: (option) => t('apiKeys.selectAccount', { account: option.label }),
      truncationNotice: pickerTruncationNotice(
        accountOptions.length,
        accountsTotalCount,
        t('settings.picker.truncationNotice')
      ),
    });
  };

  const handleOpenProjectPicker = () => {
    openPicker({
      options: projectOptions,
      selectedId: projectId,
      onSelect: handleSelectProject,
      searchPlaceholder: t('picker.searchProjects'),
      noResultsLabel: t('picker.noResults'),
      title: t('picker.selectProject'),
      resultCountLabel: t('picker.projectCount', { count: projectOptions.length }),
      optionAccessibilityLabel: (option) => t('apiKeys.selectProject', { project: option.label }),
      truncationNotice: pickerTruncationNotice(
        projectOptions.length,
        projectsTotalCount,
        t('settings.picker.truncationNotice')
      ),
    });
  };

  const handleCreate = () => {
    if (projectId) {
      router.navigate(`/api-keys/new?projectId=${encodeURIComponent(projectId)}`);
      return;
    }

    router.navigate('/api-keys/new');
  };

  const handleDelete = (id: string, name: string) => {
    sheet.present(
      ({ dismiss }) => (
        <DeleteApiKeySheet id={id} name={name} projectId={projectId} onClose={dismiss} />
      ),
      { accessibilityLabel: t('apiKeys.deleteNamed', { name }) }
    );
  };

  const handleRotate = (id: string, name: string) => {
    sheet.present(
      ({ dismiss }) => (
        <RotateApiKeySheet id={id} name={name} projectId={projectId} onClose={dismiss} />
      ),
      { accessibilityLabel: t('apiKeys.rotateNamed', { name }) }
    );
  };

  const handleRevoke = (id: string, name: string) => {
    sheet.present(
      ({ dismiss }) => (
        <RevokeApiKeySheet id={id} name={name} projectId={projectId} onClose={dismiss} />
      ),
      { accessibilityLabel: t('apiKeys.revokeNamed', { name }) }
    );
  };

  return (
    <>
      <ApiKeysListView
        accounts={accounts}
        projects={projects}
        selectedAccountId={accountId}
        selectedProjectId={projectId}
        items={items}
        isLoading={isAccountsLoading || isProjectsLoading || isKeysLoading}
        onBack={() => router.back()}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onRevoke={handleRevoke}
        onRotate={handleRotate}
        onSelectAccount={handleSelectAccount}
        onSelectProject={handleSelectProject}
        onOpenAccountPicker={handleOpenAccountPicker}
        onOpenProjectPicker={handleOpenProjectPicker}
        canCreate={has('apikey:create')}
        canDelete={has('apikey:delete')}
        canRevoke={has('apikey:revoke')}
        canRotate={has('apikey:rotate')}
      />
      {projectId ? (
        <Pagination
          border
          page={pagination.page}
          canPrev={pagination.canPrev}
          hasMore={hasMoreItems}
          onPrev={pagination.prev}
          onNext={pagination.next}
          pageLabel={t('pagination.page')}
          previousLabel={t('pagination.previous')}
          nextLabel={t('pagination.next')}
        />
      ) : null}
    </>
  );
}
