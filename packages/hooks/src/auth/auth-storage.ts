import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createStore, del, get, set } from 'idb-keyval';

import type { AuthSession } from './auth-types';

const STORAGE_KEY = 'lightbridge.auth.session';

// NOTE(web): avoid `idb-keyval` default DB/store (`keyval-store` / `keyval`).
// If a pre-existing IndexedDB database named `keyval-store` exists without the
// expected object store (or with a mismatched schema), `idb-keyval` will throw:
// `IDBDatabase.transaction: 'keyval' is not a known object store name`.
//
// Using an app-specific DB/store prevents collisions and avoids schema drift.
const WEB_DB_NAME = 'lightbridge-web-storage';
const WEB_STORE_NAME = 'auth';
const webStore = createStore(WEB_DB_NAME, WEB_STORE_NAME);

function parseStoredSession(raw: unknown): AuthSession | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseStoredSession(parsed);
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') {
    return raw as AuthSession;
  }

  return null;
}

export async function loadStoredSession(): Promise<AuthSession | null> {
  try {
    if (Platform.OS === 'web') {
      // Prefer the app-specific store.
      const raw = await get(STORAGE_KEY, webStore);
      if (raw) return parseStoredSession(raw);

      // Backward-compat: try legacy default store once (best-effort) and migrate.
      try {
        const legacyRaw = await get(STORAGE_KEY);
        if (!legacyRaw) return null;

        // Migrate into the app store (ignore failures).
        try {
          await set(STORAGE_KEY, legacyRaw, webStore);
        } catch {
          // ignore
        }
        try {
          await del(STORAGE_KEY);
        } catch {
          // ignore
        }

        return parseStoredSession(legacyRaw);
      } catch {
        return null;
      }
    }

    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return parseStoredSession(raw);
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: AuthSession) {
  if (Platform.OS === 'web') {
    await set(STORAGE_KEY, session, webStore);
    return;
  }

  const payload = JSON.stringify(session);
  await SecureStore.setItemAsync(STORAGE_KEY, payload);
}

export async function clearStoredSession() {
  if (Platform.OS === 'web') {
    // Best-effort on web; IndexedDB can fail in private mode / blocked storage.
    try {
      await del(STORAGE_KEY, webStore);
    } catch {
      // ignore
    }
    // Also clear legacy location if it exists; ignore if broken.
    try {
      await del(STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }

  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
