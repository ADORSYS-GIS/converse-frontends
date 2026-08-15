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
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false, navigate: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ projectId: 'proj-1' }),
}));

jest.mock('@lightbridge/api-native', () => ({
  copyToClipboard: jest.fn(),
}));

jest.mock('@lightbridge/hooks', () => ({
  __esModule: true,
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
      screen.queryByText("Creating API keys here requires being this project's lead or its owning account.")
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
      screen.getByText("Creating API keys here requires being this project's lead or its owning account.")
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
      message: 'RPC call failed with code conflict (status 409): An API key with this name already exists.',
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
      body: { code: 'internal', message: 'RPC call returned status 403 with an unrecognized error body' },
      message: 'RPC call failed with code internal (status 403)',
    });

    await render(<ApiKeyCreateScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await act(async () => fireEvent.press(screen.getByText('Save key')));

    expect(
      screen.getByText("Creating API keys here requires being this project's lead or its owning account.")
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
      screen.queryByText("Creating API keys here requires being this project's lead or its owning account.")
    ).toBeNull();

    // Cleanup: let the still-pending mutation settle so the test doesn't leak a dangling timer/act warning.
    await act(async () => resolveSecondAttempt?.());
  });
});
