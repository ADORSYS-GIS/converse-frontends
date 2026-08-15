import React from 'react';
import { useRouter } from 'expo-router';
import {
  useAccounts,
  useApiKeys,
  usePermissions,
  useProjects,
  useQueryState,
  useUpdateApiKey,
} from '@lightbridge/hooks';
import type { Account, ApiKey, Project } from '@lightbridge/hooks';
import { useSheet } from '@lightbridge/ui/sheet';
import { ApiKeySettingsView } from '../views/settings/api-key-settings-view';
import type { ApiKeyDetailsInput } from '../views/settings/api-key-settings-view';
import { DeleteApiKeySheet } from './delete-api-key-sheet';
import { RevokeApiKeySheet } from './revoke-api-key-sheet';

/**
 * API-key settings (#55's remaining scope). Account/project/key selection all live in the URL
 * (?accountId=…&projectId=…&keyId=…), same pattern as the project-settings and API-keys screens.
 *
 * Only `name` and `expiresAt` are wired to `useUpdateApiKey` — per `model ApiKey` in
 * packages/authz-rpc/schema/authz.cstack, every other field (`status`, `keyPrefix`, `lastUsedAt`,
 * `lastIp`, `revokedAt`, `billingPlan`) is `@readonly` and server-managed, so the view renders
 * them as plain metadata rather than editable fields. Revoke and delete reuse the existing
 * `RevokeApiKeySheet`/`DeleteApiKeySheet` sheets (owned elsewhere this wave) instead of
 * reimplementing their confirmation flows. Rotation is intentionally not duplicated here — it
 * stays on the API Keys list screen, which already wires `RotateApiKeySheet`.
 */
export function ApiKeySettingsScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const router = useRouter();
  const sheet = useSheet();
  const { has } = usePermissions();

  const [accountParam, setAccountParam] = useQueryState('accountId');
  const [projectParam, setProjectParam] = useQueryState('projectId');
  const [keyParam, setKeyParam] = useQueryState('keyId');

  const { data: accountsData = [], isLoading: isAccountsLoading } = useAccounts();
  const accounts: Account[] = accountsData;
  const accountId = accountParam ?? accounts[0]?.id;

  const { data: projectsData = [], isLoading: isProjectsLoading } = useProjects(accountId);
  const projects: Project[] = projectsData;

  const projectParamInList = projects.some((project) => project.id === projectParam);
  const projectId = (projectParamInList ? projectParam : undefined) ?? projects[0]?.id;

  // Settings is a detail surface, not a paged list — fetch a single generous page of keys for the
  // account/project selector rather than wiring up `usePagination` for a picker.
  const { data: apiKeysData = [], isLoading: isKeysLoading } = useApiKeys(projectId, {
    limit: 100,
  });
  const apiKeys: ApiKey[] = apiKeysData;

  const keyParamInList = apiKeys.some((key) => key.id === keyParam);
  const keyId = (keyParamInList ? keyParam : undefined) ?? apiKeys[0]?.id;
  const apiKey = apiKeys.find((key) => key.id === keyId);

  const updateApiKey = useUpdateApiKey();

  const handleSelectAccount = (id: string) => {
    setAccountParam(id);
    setProjectParam(null);
    setKeyParam(null);
  };

  const handleSelectProject = (id: string) => {
    setProjectParam(id);
    setKeyParam(null);
  };

  const handleSaveDetails = ({ name, expiresAt }: ApiKeyDetailsInput) => {
    if (!apiKey || !projectId) return;
    void updateApiKey
      .mutate({ id: apiKey.id, projectId, input: { name, expiresAt } })
      .catch((error) => {
        console.error('Failed to update API key details:', error);
      });
  };

  const handleRevoke = () => {
    if (!apiKey) return;
    const { id, name } = apiKey;
    sheet.present(({ dismiss }) => (
      <RevokeApiKeySheet id={id} name={name} projectId={projectId} onClose={dismiss} />
    ));
  };

  const handleDelete = () => {
    if (!apiKey) return;
    const { id, name } = apiKey;
    sheet.present(({ dismiss }) => (
      <DeleteApiKeySheet id={id} name={name} projectId={projectId} onClose={dismiss} />
    ));
  };

  const handleGoToApiKeys = () => {
    router.push(
      projectId ? `/api-keys?projectId=${encodeURIComponent(projectId)}` : '/api-keys'
    );
  };

  return (
    <ApiKeySettingsView
      showBackButton={!embedded}
      onBack={() => router.back()}
      accounts={accounts}
      projects={projects}
      apiKeys={apiKeys}
      selectedAccountId={accountId}
      selectedProjectId={projectId}
      selectedKeyId={keyId}
      apiKey={apiKey}
      isLoading={isAccountsLoading || isProjectsLoading || isKeysLoading}
      onSelectAccount={handleSelectAccount}
      onSelectProject={handleSelectProject}
      onSelectKey={setKeyParam}
      onSaveDetails={handleSaveDetails}
      isSavingDetails={updateApiKey.isPending}
      canUpdate={has('apikey:update')}
      canRevoke={has('apikey:revoke')}
      canDelete={has('apikey:delete')}
      onRevoke={handleRevoke}
      onDelete={handleDelete}
      onGoToApiKeys={handleGoToApiKeys}
    />
  );
}
