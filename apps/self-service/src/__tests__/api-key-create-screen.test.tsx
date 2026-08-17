import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

// api-key-create-screen.tsx pulls in `@lightbridge/hooks` (which drags in auth-session and the
// generated authz-rpc client) — mock the barrel with just the hooks the screen actually calls at
// render time, same spirit as api-keys-screen.test.tsx's mock of the same barrel.
// Must be `mock`-prefixed — babel-plugin-jest-hoist only allows referencing out-of-scope
// variables from inside a jest.mock() factory when the name starts with "mock".
const mockCreateKey = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => false,
    navigate: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({ projectId: 'proj-1' }),
}));

jest.mock('@lightbridge/api-native', () => ({
  copyToClipboard: jest.fn(),
}));

jest.mock('@lightbridge/hooks', () => ({
  __esModule: true,
  useBillingPlans: () => ({ data: [], isLoading: false, isError: false }),
  useCreateApiKey: () => ({ mutate: mockCreateKey, isPending: false }),
  useEnsureDefaultAccount: () => ({ mutate: jest.fn(), isPending: false }),
  useEnsureDefaultProject: () => ({ mutate: jest.fn(), isPending: false }),
  usePermissions: () => ({ has: () => false }),
}));

import { ApiKeyCreateScreen } from '../screens/api-key-create-screen';

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  mockCreateKey.mockReset();
});

describe('ApiKeyCreateScreen error handling', () => {
  it('renders nothing about the failure before any attempt is made', async () => {
    await render(<ApiKeyCreateScreen />);

    // Sanity: the form itself rendered.
    expect(screen.getByPlaceholderText('Production')).toBeTruthy();
    expect(
      screen.queryByText(
        "Creating API keys here requires being this project's lead or its owning account."
      )
    ).toBeNull();
    expect(screen.queryByText("Couldn't create the API key. Please try again.")).toBeNull();
  });

  it('shows the permission-specific copy for a 403, not the generic fallback', async () => {
    // Shape mirrors a real `CratestackRpcError` thrown by the RBAC gate: the generated
    // `readErrorBody` can't parse that gate's `{error: "..."}` body (it only understands
    // cratestack's own `{code, message}` shape), so it falls back to a generic "unrecognized
    // error body" placeholder on `body.message` — exactly what must NOT end up on screen.
    mockCreateKey.mockRejectedValue({
      name: 'CratestackRpcError',
      status: 403,
      code: 'internal',
      body: {
        code: 'internal',
        message: 'RPC call returned status 403 with an unrecognized error body',
      },
      message:
        'RPC call failed with code internal (status 403): RPC call returned status 403 with an unrecognized error body',
    });

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(
      screen.getByText(
        "Creating API keys here requires being this project's lead or its owning account."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/unrecognized error body/i)).toBeNull();
    expect(screen.queryByText("Couldn't create the API key. Please try again.")).toBeNull();
  });

  it('falls back to the generic message for a non-403 failure with no informative body', async () => {
    mockCreateKey.mockRejectedValue({
      name: 'CratestackRpcTransportError',
      message: 'Failed to fetch',
    });

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(screen.getByText("Couldn't create the API key. Please try again.")).toBeTruthy();
  });

  it('surfaces a genuinely informative body message for a non-403 failure', async () => {
    mockCreateKey.mockRejectedValue({
      name: 'CratestackRpcError',
      status: 409,
      code: 'conflict',
      body: { code: 'conflict', message: 'An API key with this name already exists.' },
      message:
        'RPC call failed with code conflict (status 409): An API key with this name already exists.',
    });

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(screen.getByText('An API key with this name already exists.')).toBeTruthy();
  });

  it('clears the error as soon as a retry starts, not just once it resolves', async () => {
    mockCreateKey.mockRejectedValueOnce({
      name: 'CratestackRpcError',
      status: 403,
      code: 'internal',
      body: {
        code: 'internal',
        message: 'RPC call returned status 403 with an unrecognized error body',
      },
      message: 'RPC call failed with code internal (status 403)',
    });

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(
      screen.getByText(
        "Creating API keys here requires being this project's lead or its owning account."
      )
    ).toBeTruthy();

    // Second attempt: leave the mutation pending (never resolved within this test) so we can
    // observe the state right after the new attempt starts, before any outcome is known.
    let resolveSecondAttempt: (() => void) | undefined;
    mockCreateKey.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSecondAttempt = () => resolve();
        })
    );

    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(
      screen.queryByText(
        "Creating API keys here requires being this project's lead or its owning account."
      )
    ).toBeNull();

    // Cleanup: let the still-pending mutation settle so the test doesn't leak a dangling timer/act warning.
    await act(async () => resolveSecondAttempt?.());
  });
});

describe('ApiKeyCreateScreen success handling', () => {
  it('shows the one-time secret card after a successful create, with no oauth2Url on the response', async () => {
    // Real `ApiKeySecret` wire shape for the common case: `oauth2.type: self` (self-signed JWT,
    // see `lightbridge-authz`'s `handlers/mod.rs::issue_secret`) never sets `oauth2_url`, and the
    // core DTO's `#[serde(default, skip_serializing_if = "Option::is_none")]` on that field means
    // it is omitted from the wire entirely when `None` -- so `data.oauth2Url` is `undefined`
    // here, not `null`. `useCreateApiKey`'s `mutate` resolves with this object directly (it wraps
    // `getAuthzRpcClient().procedures.createApiKey(...)`, whose generated client does no runtime
    // validation of the response -- see `packages/authz-rpc/generated/src/client.ts`), and
    // `onSuccess` reads `data.secret`/`data.oauth2Url` straight off it.
    mockCreateKey.mockImplementation(
      (_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        const data = { secret: 'lbk_secret_realistic_value_abc123' };
        onSuccess(data);
        return Promise.resolve(data);
      }
    );

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(screen.getByText('Key Created Successfully')).toBeTruthy();
    expect(screen.getByText('lbk_secret_realistic_value_abc123')).toBeTruthy();
    expect(screen.queryByText('OAuth2 token endpoint:')).toBeNull();
  });

  it('shows the one-time secret card and the oauth2Url when the backend returns one', async () => {
    // Real wire shape for `oauth2.type: external` (KC token-exchange, see
    // `OAuth2TokenIssuer::issue`): `oauth2_url` is `Some(String)`, the operator-configured token
    // endpoint.
    mockCreateKey.mockImplementation(
      (_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        const data = {
          secret: 'lbk_secret_realistic_value_abc123',
          oauth2Url: 'https://keycloak.example.com/realms/dev/protocol/openid-connect/token',
        };
        onSuccess(data);
        return Promise.resolve(data);
      }
    );

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(screen.getByText('Key Created Successfully')).toBeTruthy();
    expect(screen.getByText('lbk_secret_realistic_value_abc123')).toBeTruthy();
    expect(screen.getByText('OAuth2 token endpoint:')).toBeTruthy();
    expect(
      screen.getByText('https://keycloak.example.com/realms/dev/protocol/openid-connect/token')
    ).toBeTruthy();
  });

  it('does not crash and simply omits the oauth2Url section when the response carries a non-string oauth2Url', async () => {
    // The regression this screen shipped without coverage for: a response whose `oauth2Url` is
    // present but not a string (see `one-time-secret-card.test.tsx`'s matching unit test for the
    // exact mechanism -- `normalizeOauth2Url`'s `useMemo` threw `TypeError: ...trim is not a
    // function` before the fix, blanking the whole screen with no error boundary to catch it).
    // This is the end-to-end version of that same regression, through the real screen/view/mutate
    // wiring rather than the component in isolation.
    mockCreateKey.mockImplementation(
      (_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        const data = {
          secret: 'lbk_secret_realistic_value_abc123',
          oauth2Url: { unexpected: 'shape' },
        };
        onSuccess(data);
        return Promise.resolve(data);
      }
    );

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(screen.getByText('Key Created Successfully')).toBeTruthy();
    expect(screen.getByText('lbk_secret_realistic_value_abc123')).toBeTruthy();
    expect(screen.queryByText('OAuth2 token endpoint:')).toBeNull();
  });
});
