import { afterEach, describe, expect, it, vi } from 'vitest';

const queryUsageSdkMock = vi.fn();

vi.mock('@lightbridge/api-rest', () => ({
  queryUsage: (...args: unknown[]) => queryUsageSdkMock(...args),
}));

// jsdom (this file runs in the `dom` vitest project — see `vitest.config.ts`, and this module
// itself reads `window.location` — a `.test.ts` file would run under the `node` project, where
// `window` does not exist at all) supplies `window.location.origin`; pinned explicitly here so
// the assertion below isn't hostage to jsdom's default origin.
const ORIGIN = 'https://console.ai.camer.digital';

afterEach(() => {
  vi.unstubAllGlobals();
  queryUsageSdkMock.mockReset();
});

describe('queryUsage', () => {
  it('calls the generated SDK against the same-origin /api/usage proxy, never the backend directly', async () => {
    vi.stubGlobal('location', { ...window.location, origin: ORIGIN });
    const { queryUsage } = await import('./usage-client');
    queryUsageSdkMock.mockResolvedValueOnce({ data: { points: [] } });

    const request = {
      scope: 'account' as const,
      scope_id: 'acct_1',
      start_time: '2026-08-01T00:00:00.000Z',
      end_time: '2026-08-28T00:00:00.000Z',
    };
    const result = await queryUsage(request);

    expect(queryUsageSdkMock).toHaveBeenCalledWith({
      baseURL: `${ORIGIN}/api/usage`,
      body: request,
      throwOnError: true,
    });
    expect(result).toEqual({ points: [] });
  });

  it('propagates a rejection rather than returning it as data (#304: typed, not swallowed)', async () => {
    const { queryUsage } = await import('./usage-client');
    const failure = Object.assign(new Error('Request failed with status code 503'), {
      response: { data: { error: 'usage_backend_not_configured' }, status: 503 },
    });
    queryUsageSdkMock.mockRejectedValueOnce(failure);

    await expect(
      queryUsage({
        scope: 'account',
        scope_id: 'acct_1',
        start_time: '2026-08-01T00:00:00.000Z',
        end_time: '2026-08-28T00:00:00.000Z',
      })
    ).rejects.toBe(failure);
  });
});

describe('getUsageErrorMessage', () => {
  it('maps a known proxy error code to a readable message', async () => {
    const { getUsageErrorMessage } = await import('./usage-client');
    const error = { response: { data: { error: 'usage_backend_not_configured' } } };

    expect(getUsageErrorMessage(error)).toBe(
      'The usage backend is not configured for this environment yet.'
    );
  });

  it('maps session_expired distinctly from a generic unreachable backend', async () => {
    const { getUsageErrorMessage } = await import('./usage-client');

    expect(getUsageErrorMessage({ response: { data: { error: 'session_expired' } } })).toBe(
      'Your session expired. Sign in again.'
    );
    expect(getUsageErrorMessage({ response: { data: { error: 'upstream_unreachable' } } })).toBe(
      'The usage backend is unreachable right now.'
    );
  });

  it('passes through an unrecognised backend UsageErrorResponse string verbatim', async () => {
    const { getUsageErrorMessage } = await import('./usage-client');
    const error = { response: { data: { error: 'invalid group_by dimension: foo' } } };

    expect(getUsageErrorMessage(error)).toBe('invalid group_by dimension: foo');
  });

  it('falls back to the error message for a bare transport failure with no response body', async () => {
    const { getUsageErrorMessage } = await import('./usage-client');

    expect(getUsageErrorMessage(new Error('Network Error'))).toBe('Network Error');
  });

  it('never throws — falls back to a generic message for a value with nothing usable', async () => {
    const { getUsageErrorMessage } = await import('./usage-client');

    expect(getUsageErrorMessage(null)).toBe('Failed to load usage data.');
    expect(getUsageErrorMessage(undefined)).toBe('Failed to load usage data.');
    expect(getUsageErrorMessage({})).toBe('Failed to load usage data.');
  });
});
