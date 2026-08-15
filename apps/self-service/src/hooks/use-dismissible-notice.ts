import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY_PREFIX = 'lightbridge.notice.';

/**
 * Storage for one-time, dismissible in-app notices. Mirrors the platform
 * split used by `packages/hooks/src/auth/auth-storage.ts` (SecureStore on
 * native), but reads/writes web state through `localStorage` instead of
 * `idb-keyval` — the same web-storage mechanism `ThemePreferenceProvider`
 * (`apps/self-service/src/theme/theme-preference.tsx`) already relies on in
 * this app — rather than adding a new dependency to this package for a
 * single boolean flag per notice.
 */
function readDismissedSync(key: string): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

async function readDismissed(key: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return readDismissedSync(key);
  }
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw === 'true';
  } catch {
    return false;
  }
}

function writeDismissed(key: string): void {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, 'true');
      }
    } catch {
      // Best-effort: private-mode/blocked storage just means the notice may
      // reappear next visit, which is an acceptable degradation.
    }
    return;
  }
  void SecureStore.setItemAsync(key, 'true').catch(() => undefined);
}

/**
 * Tracks whether a one-time notice identified by `id` has already been
 * dismissed, persisting the acknowledgement so it does not reappear on later
 * visits.
 *
 * On web the stored value is available synchronously (`localStorage`), so
 * `isReady` starts `true` and there's no flash of the notice before its
 * dismissed state is known. On native, `SecureStore` is async, so callers
 * should treat `isReady === false` as "don't render yet" to avoid a flash of
 * a notice that turns out to already be dismissed.
 */
export function useDismissibleNotice(id: string): {
  isDismissed: boolean;
  isReady: boolean;
  dismiss: () => void;
} {
  const key = `${KEY_PREFIX}${id}`;
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    Platform.OS === 'web' ? readDismissedSync(key) : false
  );
  const [isReady, setIsReady] = useState<boolean>(Platform.OS === 'web');

  useEffect(() => {
    let cancelled = false;

    if (Platform.OS === 'web') {
      setIsDismissed(readDismissedSync(key));
      setIsReady(true);
      return;
    }

    setIsReady(false);
    void readDismissed(key).then((value) => {
      if (!cancelled) {
        setIsDismissed(value);
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const dismiss = () => {
    setIsDismissed(true);
    writeDismissed(key);
  };

  return { isDismissed, isReady, dismiss };
}
