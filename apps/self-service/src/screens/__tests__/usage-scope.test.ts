import { resolveUsageScopeId } from '../usage-scope';

const ids = {
  accountId: 'account-1',
  projectId: 'project-1',
  userId: 'user-1',
  apiKeyId: 'key-1',
};

describe('resolveUsageScopeId', () => {
  it('resolves the account id for account scope', () => {
    expect(resolveUsageScopeId('account', ids)).toBe('account-1');
  });

  it('resolves the project id for project scope', () => {
    expect(resolveUsageScopeId('project', ids)).toBe('project-1');
  });

  it('resolves the user id for user scope', () => {
    expect(resolveUsageScopeId('user', ids)).toBe('user-1');
  });

  it('resolves the selected api key id for api_key scope', () => {
    expect(resolveUsageScopeId('api_key', ids)).toBe('key-1');
  });

  it('returns undefined for api_key scope when no key has been selected yet', () => {
    expect(resolveUsageScopeId('api_key', { ...ids, apiKeyId: null })).toBeUndefined();
  });

  it('falls back to project id for an unrecognized scope value', () => {
    // @ts-expect-error deliberately passing an invalid scope to exercise the default branch
    expect(resolveUsageScopeId('unknown', ids)).toBe('project-1');
  });
});
