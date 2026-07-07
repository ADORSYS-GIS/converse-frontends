import type { UsageBackendUsageScope } from '@lightbridge/api-rest';

export function resolveUsageScopeId(
  scope: UsageBackendUsageScope,
  ids: { accountId?: string; projectId?: string; userId?: string; apiKeyId?: string | null }
): string | undefined {
  switch (scope) {
    case 'account':
      return ids.accountId;
    case 'user':
      return ids.userId;
    case 'api_key':
      return ids.apiKeyId ?? undefined;
    case 'project':
    default:
      return ids.projectId;
  }
}
