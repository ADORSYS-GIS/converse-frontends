import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { del, get, set } from 'idb-keyval';

import type { AuthSession } from './auth-types';

const STORAGE_KEY = 'lightbridge.auth.session';

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
      const raw = await get(STORAGE_KEY);
      return parseStoredSession(raw);
    }

    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return parseStoredSession(raw);
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: AuthSession) {
  if (Platform.OS === 'web') {
    await set(STORAGE_KEY, session);
    return;
  }

  const payload = JSON.stringify(session);
  await SecureStore.setItemAsync(STORAGE_KEY, payload);
}

export async function clearStoredSession() {
  if (Platform.OS === 'web') {
    await del(STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
