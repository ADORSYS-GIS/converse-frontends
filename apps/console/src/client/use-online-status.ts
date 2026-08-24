'use client';

import { useEffect, useState } from 'react';

/**
 * Connectivity, for the header's inline status line.
 *
 * Starts optimistic (`true`) rather than reading `navigator.onLine` during render: the provider
 * tree is browser-only, but starting from a fixed value keeps the first paint deterministic and the
 * `online`/`offline` events correct it within a tick.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
