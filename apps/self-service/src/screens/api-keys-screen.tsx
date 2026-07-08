import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  useAccounts,
  useApiKeys,
  usePagination,
  useProjects,
  useRevokeApiKey,
} from '@lightbridge/hooks';
import type { ApiKeyBackendAccount, ApiKeyBackendProject } from '@lightbridge/api-rest';
import { ApiKeysListView } from '../views/api-keys-list-view';

const PAGE_SIZE = 10;

export function ApiKeysScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ accountId?: string; projectId?: string }>();
  const pagination = usePagination({ pageSize: PAGE_SIZE });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const router = useRouter();
  const { data: accountsData = [], isLoading: isAccountsLoading } = useAccounts();
  const accounts: ApiKeyBackendAccount[] = accountsData;
  const revokeKey = useRevokeApiKey();

  useEffect(() => {
    if (params.accountId) {
      setSelectedAccountId(params.accountId);
    }
  }, [params.accountId]);

  useEffect(() => {
    if (params.projectId) {
      setSelectedProjectId(params.projectId);
    }
  }, [params.projectId]);

  useEffect(() => {
    if (!selectedAccountId && accounts[0]?.id) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const accountId = selectedAccountId ?? accounts[0]?.id;
  const { data: projectsData = [], isLoading: isProjectsLoading } = useProjects(accountId);
  const projects: ApiKeyBackendProject[] = projectsData;

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId(null);
      return;
    }

    const hasSelectedProject = projects.some((project) => project.id === selectedProjectId);

    if (!hasSelectedProject) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const projectId = selectedProjectId ?? projects[0]?.id;
  const { data: items = [], isLoading: isKeysLoading } = useApiKeys(projectId, {
    offset: pagination.offset,
    limit: pagination.limit,
  });

  // No total-count from the backend, so "is there a next page" is inferred from
  // whether this page came back full (documented heuristic — see usePagination).
  const hasMore = pagination.hasMore(items.length);

  const handleSelectAccount = (id: string) => {
    pagination.reset();
    setSelectedAccountId(id);
    setSelectedProjectId(null);
  };

  const handleSelectProject = (id: string) => {
    pagination.reset();
    setSelectedProjectId(id);
  };

  const handleCreate = () => {
    if (projectId) {
      router.navigate(`/api-keys/new?projectId=${encodeURIComponent(projectId)}`);
      return;
    }

    router.navigate('/api-keys/new');
  };

  const handleDelete = (id: string, name: string) => {
    const projectQuery = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    router.push(
      `/delete-api-key?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}${projectQuery}`
    );
  };

  const handleRotate = (id: string, name: string) => {
    const projectQuery = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    router.push(
      `/rotate-api-key?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}${projectQuery}`
    );
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
      onNext={pagination.next}
      onPrev={pagination.prev}
      hasMore={hasMore}
      canPrev={pagination.canPrev}
      page={pagination.page}
    />
  );
}
