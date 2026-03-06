import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import { getAuthReady } from '../auth/use-auth-session';

type SyncState = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt?: number;
};

export function useBackendSync() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
  });

  const syncNow = useCallback(async () => {
    // Don't sync if auth is not ready yet
    if (!getAuthReady()) {
      return;
    }

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['usage'] }),
      ]);

      setState((prev) => ({
        ...prev,
        lastSyncedAt: Date.now(),
      }));
    } finally {
      setState((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((status) => {
      const isOnline = Boolean(status.isConnected && status.isInternetReachable !== false);
      setState((prev) => ({ ...prev, isOnline }));
      if (isOnline) {
        syncNow();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncNow]);

  return {
    ...state,
    syncNow,
  };
}
