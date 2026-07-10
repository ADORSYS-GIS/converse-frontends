import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  useAccounts,
  useApiKeys,
  useProjects,
  useQueryState,
  useRevokeApiKey,
} from '@lightbridge/hooks';
import type { ApiKeyBackendAccount, ApiKeyBackendProject } from '@lightbridge/api-rest';
import { useSheet } from '@lightbridge/ui/sheet';
import { ApiKeysListView } from '../views/api-keys-list-view';
import { DeleteApiKeySheet } from './delete-api-key-sheet';
import { RotateApiKeySheet } from './rotate-api-key-sheet';

const PAGE_SIZE = 10;

export function ApiKeysScreen() {
  const { t } = useTranslation();
  const sheet = useSheet();
  // Account/project selection lives in the URL (?accountId=…&projectId=…) so it
  // survives refresh and deep-links, read straight through useQueryState — no
  // useLocalSearchParams + useState + useEffect sync dance.
  const [accountParam, setAccountParam] = useQueryState('accountId');
  const [projectParam, setProjectParam] = useQueryState('projectId');
  const router = useRouter();
  const { data: accountsData = [], isLoading: isAccountsLoading } = useAccounts();
  const accounts: ApiKeyBackendAccount[] = accountsData;
  const revokeKey = useRevokeApiKey();

  // Effective account: the URL param when set, otherwise the first account.
  const accountId = accountParam ?? accounts[0]?.id;
  const { data: projectsData = [], isLoading: isProjectsLoading } = useProjects(accountId);
  const projects: ApiKeyBackendProject[] = projectsData;

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
    sheet.present(({ dismiss }) => (
      <DeleteApiKeySheet id={id} name={name} projectId={projectId} onClose={dismiss} />
    ));
  };

  const handleRotate = (id: string, name: string) => {
    sheet.present(({ dismiss }) => (
      <RotateApiKeySheet id={id} name={name} projectId={projectId} onClose={dismiss} />
    ));
  };

  const handleRevoke = (id: string, name: string) => {
    Alert.alert(
      t('apiKeys.revokeConfirmTitle'),
      t('apiKeys.revokeConfirmMessage', { name }),
      [
        { text: t('apiKeys.revokeCancel'), style: 'cancel' },
        {
          text: t('apiKeys.revoke'),
          style: 'destructive',
          onPress: () => {
            if (!projectId) return;
            void revokeKey.mutateAsync({ id, projectId }).catch((error) => {
              console.error('Failed to revoke API key:', error);
            });
          },
        },
      ],
      { cancelable: true }
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
    />
  );
}
