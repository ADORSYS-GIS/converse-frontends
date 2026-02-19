import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { AppRuntimeConfig } from './runtime-config-types';
import { isAppRuntimeConfig } from './runtime-config-types';

const RuntimeConfigContext = createContext<AppRuntimeConfig | null>(null);

function getEnvConfig(): AppRuntimeConfig {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const issuer = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER;
  const clientId = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
  const scheme = process.env.EXPO_PUBLIC_KEYCLOAK_SCHEME;

  if (!backendUrl || !issuer || !clientId || !scheme) {
    throw new Error('Missing required EXPO_PUBLIC_* config values.');
  }

  return {
    backendUrl,
    keycloak: {
      issuer,
      clientId,
      scheme,
    },
  };
}

async function fetchWebConfig(): Promise<AppRuntimeConfig> {
  if (typeof document === 'undefined') {
    throw new Error('config.json is not available without a document.');
  }

  const url = new URL('/config.json', document.baseURI).toString();
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load config.json (${response.status}).`);
  }

  const json = await response.json();

  if (!isAppRuntimeConfig(json)) {
    throw new Error('Invalid config.json payload.');
  }

  return json;
}

async function loadRuntimeConfig(): Promise<AppRuntimeConfig> {
  const isProd = process.env.NODE_ENV === 'production';
  const isWeb = Platform.OS === 'web';

  if (isProd && isWeb) {
    return await fetchWebConfig();
  }

  return getEnvConfig();
}

export function RuntimeConfigProvider({
  children,
  fallback = null,
  onReady,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReady?: (config: AppRuntimeConfig) => void;
}) {
  const [config, setConfig] = useState<AppRuntimeConfig | null>(null);

  useEffect(() => {
    let mounted = true;

    loadRuntimeConfig()
      .then((next) => {
        if (mounted) {
          setConfig(next);
          onReady?.(next);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!config) {
    return <>{fallback}</>;
  }

  return <RuntimeConfigContext.Provider value={config}>{children}</RuntimeConfigContext.Provider>;
}

export function useRuntimeConfig(): AppRuntimeConfig {
  const config = useContext(RuntimeConfigContext);

  if (!config) {
    throw new Error('Runtime config is not ready.');
  }

  return config;
}
