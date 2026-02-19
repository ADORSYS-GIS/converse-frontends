import React from 'react';
import { I18nextProvider } from 'react-i18next';

import { i18n, initI18n } from './i18n-config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  if (!i18n.isInitialized) {
    initI18n('en');
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
