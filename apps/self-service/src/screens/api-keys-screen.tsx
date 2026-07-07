import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import { useAccounts, useApiKeys, useProjects, useRevokeApiKey } from '@lightbridge/hooks';
import type { ApiKeyBackendAccount, ApiKeyBackendProject } from '@lightbridge/api-rest';
import { ApiKeysListView } from '../views/api-keys-list-view';

const PAGE_SIZE = 10;

export function ApiKeysScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ accountId?: string; projectId?: string }>();
  const [offset, setOffset] = useState(0);
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
  const { data: allItems = [], isLoading: isKeysLoading } = useApiKeys(projectId);

  const slicedItems = useMemo(() => {
    return allItems.slice(offset, offset + PAGE_SIZE);
  }, [allItems, offset]);

  const hasMore = allItems.length > offset + PAGE_SIZE;
  const canPrev = offset > 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  const handleNext = () => {
    if (hasMore) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  };

  const handlePrev = () => {
    if (canPrev) {
      setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
    }
  };

  const handleSelectAccount = (id: string) => {
    setOffset(0);
    setSelectedAccountId(id);
    setSelectedProjectId(null);
  };

  const handleSelectProject = (id: string) => {
    setOffset(0);
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
      items={slicedItems}
      isLoading={isAccountsLoading || isProjectsLoading || isKeysLoading}
      onBack={() => router.back()}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onRevoke={handleRevoke}
      onRotate={handleRotate}
      onSelectAccount={handleSelectAccount}
      onSelectProject={handleSelectProject}
      onNext={handleNext}
      onPrev={handlePrev}
      hasMore={hasMore}
      canPrev={canPrev}
      page={page}
    />
  );
}
