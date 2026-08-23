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

  // Web: `readDismissedSync` is genuinely synchronous (`localStorage`), so both the initial value
  // and re-syncing when `key` changes (the caller passed a different notice `id`) happen during
  // render rather than in a post-commit effect -- the same "adjust state when a prop changes"
  // shape as `project-settings-view.tsx`'s `resetKey`
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  // `Platform.OS` never changes for a running app instance, so branching on it here alongside a
  // Hook call carries no conditional-hook-order risk. `isReady` is always `true` on web -- there's
  // nothing to wait for.
  const [webIsDismissed, setWebIsDismissed] = useState<boolean>(() =>
    Platform.OS === 'web' ? readDismissedSync(key) : false
  );
  const [syncedKey, setSyncedKey] = useState(Platform.OS === 'web' ? key : undefined);
  if (Platform.OS === 'web' && key !== syncedKey) {
    setSyncedKey(key);
    setWebIsDismissed(readDismissedSync(key));
  }

  // Native: `SecureStore` is genuinely async, so this does stay in an effect -- fetching from an
  // external system is what effects are for. But rather than a `setIsReady(false)` "reset the
  // loading flag" call before kicking off the read (itself a direct, unconditional setState in
  // the effect body, and just as flagged as the web branch this hook used to have), readiness is
  // *derived*: `nativeResolved` records which `key` the last completed read was for, and
  // `isReady`/`isDismissed` below are simply "does that match the current key" -- no separate
  // loading flag to remember to flip back off.
  const [nativeResolved, setNativeResolved] = useState<
    { key: string; dismissed: boolean } | undefined
  >(undefined);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let cancelled = false;
    void readDismissed(key).then((value) => {
      if (!cancelled) {
        setNativeResolved({ key, dismissed: value });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const isReady = Platform.OS === 'web' || nativeResolved?.key === key;
  const isDismissed =
    Platform.OS === 'web'
      ? webIsDismissed
      : nativeResolved?.key === key && nativeResolved.dismissed;

  const dismiss = () => {
    if (Platform.OS === 'web') {
      setWebIsDismissed(true);
    } else {
      setNativeResolved({ key, dismissed: true });
    }
    writeDismissed(key);
  };

  return { isDismissed, isReady, dismiss };
}
