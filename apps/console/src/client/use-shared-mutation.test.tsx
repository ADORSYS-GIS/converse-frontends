import { CratestackRpcError } from '@lightbridge/authz-rpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { useSharedMutation } from './use-shared-mutation';

function Wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Ticket #319 AC: "surface server-side validation errors typed rather than as a raw RPC string."
 * Before this change, `errorMessage` was `error.message` on whatever was thrown — for a real
 * `CratestackRpcError` that is the whole transport-wrapped string ("RPC call failed with code
 * invalid_argument (status 400): unknown billing_plan 'standard': ..."), the exact shape the
 * owner hit and reported. This asserts the shared mutation now surfaces just the server's own
 * decoded reason.
 */
describe('useSharedMutation error surfacing', () => {
  it('unwraps a CratestackRpcError to the server’s own message, not the RPC transport wrapper', async () => {
    const { result } = renderHook(
      () =>
        useSharedMutation<void, void>({
          mutationKey: ['test', 'create-key'],
          mutationFn: async () => {
            throw new CratestackRpcError(400, {
              code: 'invalid_argument',
              message:
                "unknown billing_plan 'standard': must be one of the configured plans [free, pro, enterprise]",
            });
          },
        }),
      { wrapper: Wrapper }
    );

    act(() => result.current.mutate(undefined));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        "unknown billing_plan 'standard': must be one of the configured plans [free, pro, enterprise]"
      )
    );
    expect(result.current.errorMessage).not.toContain('RPC call failed with code');
  });

  it('falls back to the plain message for a non-RPC error (e.g. a client-side guard)', async () => {
    const { result } = renderHook(
      () =>
        useSharedMutation<void, void>({
          mutationKey: ['test', 'guard'],
          mutationFn: async () => {
            throw new Error('Select a project before creating a key.');
          },
        }),
      { wrapper: Wrapper }
    );

    act(() => result.current.mutate(undefined));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('Select a project before creating a key.')
    );
  });
});
