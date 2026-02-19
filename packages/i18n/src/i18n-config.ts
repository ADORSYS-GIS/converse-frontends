import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: {
        brand: 'Self-Service',
        splash: {
          loading: 'Loading your workspace...',
        },
      },
      login: {
        title: 'Login',
        welcome: 'Welcome back',
        description: "Connect with your organization's SSO provider to continue.",
        sso: 'Continue with SSO',
        ssoLoading: 'Opening SSO...',
        help: 'Help',
        trouble: 'Trouble signing in?',
        footnote: 'SSO keeps your account secure across every device.',
      },
      apiKeys: {
        title: 'API Keys',
        subtitle: 'Manage your secret keys to authenticate your API requests.',
        new: 'New key',
        edit: 'Edit',
        delete: 'Delete',
        keyLabel: 'Key name',
        placeholder: 'Production',
        save: 'Save key',
        saving: 'Saving...',
        createTitle: 'Create or Update',
        back: 'Go back',
        copy: 'Copy API key',
        createdOn: 'Created on {{date}}',
        securityNote:
          'Keep your API keys secure. Never share them in publicly accessible areas such as GitHub or client-side code.',
      },
      usage: {
        title: 'Token Usage',
        tokens: '{{formatted}} tokens',
        requests: '{{formatted}} requests',
      },
      deleteKey: {
        title: 'Delete API key',
        description: 'You are about to delete "{{name}}". This action cannot be undone.',
        cancel: 'Cancel',
        confirm: 'Delete',
        deleting: 'Deleting...',
      },
      nav: {
        login: 'Login',
        home: 'Home',
        apiKeys: 'API Keys',
        apiKeyEditor: 'Create Key',
        usage: 'Usage',
      },
      home: {
        welcomeBack: 'Welcome back,',
        greeting: 'Hello, {{name}}',
        defaultName: 'Alex Rivera',
        currentUsage: 'Current API Usage',
        usagePercent: '{{percent}}%',
        usageSummary: '{{used}} of {{total}} monthly requests',
        quickActions: {
          title: 'Quick Actions',
          newToken: 'New Token',
          endpoints: 'Endpoints',
          usageLogs: 'Usage Logs',
          support: 'Support',
        },
        activeServices: {
          title: 'Active Services',
        },
        services: {
          productionGateway: 'Production Gateway',
          analyticsEngine: 'Analytics Engine',
        },
        version: 'v{{version}}',
      },
    },
  },
};

export function initI18n(locale: string) {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: 'en',
      returnNull: false,
      interpolation: {
        escapeValue: false,
      },
    });

    return i18n;
  }

  if (locale && i18n.language !== locale) {
    i18n.changeLanguage(locale);
  }

  return i18n;
}

export async function setLocale(locale: string) {
  if (!i18n.isInitialized) {
    initI18n(locale);
    return;
  }

  await i18n.changeLanguage(locale);
}

export { i18n };
