import { useEffect, useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import * as Localization from 'expo-localization';

import { initI18n, setLocale as setI18nLocale } from '@lightbridge/i18n';
import { localeCollection, setLocaleState } from './data/locale-store';

const fallbackLocale = 'en';

function getDeviceLocale() {
  const locales = Localization.getLocales();
  return locales[0]?.languageTag ?? fallbackLocale;
}

export function useLocaleSync() {
  const { data } = useLiveQuery((q) => q.from({ locale: localeCollection }));

  const storedLocale = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data[0]?.locale ?? fallbackLocale;
    }
    return fallbackLocale;
  }, [data]);

  useEffect(() => {
    const deviceLocale = getDeviceLocale();
    const resolvedLocale = storedLocale || deviceLocale;

    initI18n(resolvedLocale);

    if (!storedLocale || storedLocale !== resolvedLocale) {
      setLocaleState(resolvedLocale);
    }
  }, [storedLocale]);

  const updateLocale = async (nextLocale: string) => {
    setLocaleState(nextLocale);
    await setI18nLocale(nextLocale);
  };

  return {
    locale: storedLocale,
    updateLocale,
  };
}
