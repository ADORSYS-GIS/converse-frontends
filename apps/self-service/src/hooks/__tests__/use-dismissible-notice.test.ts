import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { useDismissibleNotice } from '../use-dismissible-notice';

const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;

// jest-expo's default test platform is 'ios' (confirmed by inspection), so this
// file exercises the native (SecureStore) branch. The web (localStorage)
// branch is covered separately in use-dismissible-notice-web.test.ts.
describe('useDismissibleNotice (native)', () => {
  beforeEach(() => {
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue(undefined);
  });

  it('is not ready until the SecureStore read resolves, then reports not-dismissed', async () => {
    let resolveRead: (value: string | null) => void = () => undefined;
    mockGetItemAsync.mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRead = resolve;
        })
    );

    const { result } = await renderHook(() => useDismissibleNotice('test-notice'));

    expect(result.current.isReady).toBe(false);
    expect(mockGetItemAsync).toHaveBeenCalledWith('lightbridge.notice.test-notice');

    await act(async () => {
      resolveRead(null);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.isDismissed).toBe(false);
  });

  it('reports dismissed when a prior dismissal was persisted', async () => {
    mockGetItemAsync.mockResolvedValue('true');

    const { result } = await renderHook(() => useDismissibleNotice('test-notice'));

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isDismissed).toBe(true);
  });

  it('dismiss() flips state immediately and persists via SecureStore', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const { result } = await renderHook(() => useDismissibleNotice('test-notice'));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      result.current.dismiss();
    });

    expect(result.current.isDismissed).toBe(true);
    expect(mockSetItemAsync).toHaveBeenCalledWith('lightbridge.notice.test-notice', 'true');
  });

  it('scopes storage keys per notice id, so two ids never collide', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    await renderHook(() => useDismissibleNotice('allowlist-enforced.proj-1'));
    await renderHook(() => useDismissibleNotice('allowlist-enforced.proj-2'));

    expect(mockGetItemAsync).toHaveBeenCalledWith('lightbridge.notice.allowlist-enforced.proj-1');
    expect(mockGetItemAsync).toHaveBeenCalledWith('lightbridge.notice.allowlist-enforced.proj-2');
  });
});
