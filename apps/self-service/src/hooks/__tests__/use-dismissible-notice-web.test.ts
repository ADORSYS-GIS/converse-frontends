import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

// Force the web branch (localStorage-backed) for this file. jest-expo's
// default test platform is 'ios' — see use-dismissible-notice.test.ts for the
// native (SecureStore) branch.
Platform.OS = 'web';

// The jest-expo env is node (no jsdom) → no `localStorage`. Same shim used by
// apps/self-service/src/theme/__tests__/theme-preference.test.tsx.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}
(globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage() as unknown as Storage;

import { useDismissibleNotice } from '../use-dismissible-notice';

beforeEach(() => {
  localStorage.clear();
});

describe('useDismissibleNotice (web)', () => {
  it('is ready synchronously and reports not-dismissed when nothing is stored', async () => {
    const { result } = await renderHook(() => useDismissibleNotice('test-notice'));

    expect(result.current.isReady).toBe(true);
    expect(result.current.isDismissed).toBe(false);
  });

  it('hydrates a prior dismissal from localStorage synchronously', async () => {
    localStorage.setItem('lightbridge.notice.test-notice', 'true');

    const { result } = await renderHook(() => useDismissibleNotice('test-notice'));

    expect(result.current.isDismissed).toBe(true);
  });

  it('dismiss() persists to localStorage and does not reappear on a later mount', async () => {
    const { result, unmount } = await renderHook(() => useDismissibleNotice('test-notice'));

    await act(async () => {
      result.current.dismiss();
    });

    expect(localStorage.getItem('lightbridge.notice.test-notice')).toBe('true');

    await act(async () => {
      unmount();
    });

    const { result: remounted } = await renderHook(() => useDismissibleNotice('test-notice'));
    expect(remounted.current.isDismissed).toBe(true);
  });
});
