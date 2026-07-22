import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  useAccounts,
  useApiKeys,
  usePermissions,
  useProjects,
  useQueryState,
} from '@lightbridge/hooks';
import type { Account, Project } from '@lightbridge/authz-rpc';
import { useSheet } from '@lightbridge/ui/sheet';
import { ApiKeysListView } from '../views/api-keys-list-view';
import { DeleteApiKeySheet } from './delete-api-key-sheet';
import { RevokeApiKeySheet } from './revoke-api-key-sheet';
import { RotateApiKeySheet } from './rotate-api-key-sheet';

const PAGE_SIZE = 10;

export function ApiKeysScreen() {
  const { t } = useTranslation();
  const sheet = useSheet();
  const { has } = usePermissions();
  // Account/project selection lives in the URL (?accountId=…&projectId=…) so it
  // survives refresh and deep-links, read straight through useQueryState — no
  // useLocalSearchParams + useState + useEffect sync dance.
  const [accountParam, setAccountParam] = useQueryState('accountId');
  const [projectParam, setProjectParam] = useQueryState('projectId');
  const router = useRouter();
  const { data: accountsData = [], isLoading: isAccountsLoading } = useAccounts();
  const accounts: Account[] = accountsData;

  // Effective account: the URL param when set, otherwise the first account.
  const accountId = accountParam ?? accounts[0]?.id;
  const { data: projectsData = [], isLoading: isProjectsLoading } = useProjects(accountId);
  const projects: Project[] = projectsData;

  // Effective project: the URL param when it belongs to the current account's
  // projects, otherwise the first project (so switching account falls back
  // cleanly even while a stale ?projectId lingers in the URL).
  const projectParamInList = projects.some((project) => project.id === projectParam);
  const projectId = (projectParamInList ? projectParam : undefined) ?? projects[0]?.id;

  const { data: items = [], isLoading: isKeysLoading } = useApiKeys(projectId, {
    offset: 0,
    limit: PAGE_SIZE,
  });

  const handleSelectAccount = (id: string) => {
    setAccountParam(id);
    setProjectParam(null);
  };

  const handleSelectProject = (id: string) => {
    setProjectParam(id);
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
      canCreate={has('apikey:create')}
      canDelete={has('apikey:delete')}
      canRevoke={has('apikey:revoke')}
      canRotate={has('apikey:rotate')}
    />
  );
}
