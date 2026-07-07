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
      project: {
        defaultName: 'Default Project',
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
        scopeEyebrow: 'Account / project scope',
        subtitle: 'Manage project-scoped secret keys used to authenticate API requests.',
        emptyState: 'No API keys found. Create one to get started.',
        loading: 'Loading API keys...',
        new: 'New API Key',
        edit: 'Edit',
        delete: 'Delete',
        deleteNamed: 'Delete {{name}}',
        accountsLabel: 'Accounts',
        projectsLabel: 'Projects',
        noAccounts: 'No accounts available.',
        noProjects: 'No projects available for this account.',
        selectAccount: 'Select account {{account}}',
        selectProject: 'Select project {{project}}',
        currentProject: 'Current project',
        noProjectSelected: 'No project selected',
        projectRequired: 'Select a project before creating an API key.',
        projectMetadata: '{{plan}} plan · {{models}} allowed models',
        keyPrefix: 'Prefix {{prefix}}',
        lastUsed: 'Last used {{date}}',
        neverUsed: 'Never used',
        expiresOn: 'Expires {{date}}',
        status: {
          active: 'Active',
          revoked: 'Revoked',
        },
        keyLabel: 'Key name',
        placeholder: 'Production',
        save: 'Save key',
        saving: 'Saving...',
        createTitle: 'Create or Update',
        back: 'Go back',
        copy: 'Copy API key',
        copied: 'Copied!',
        createdOn: 'Created on {{date}}',
        createdSuccessfully: 'Key Created Successfully',
        yourNewKey: 'Your new API key:',
        backToKeys: 'Back to API Keys',
        securityNote:
          'Keep your API keys secure. Never share them in publicly accessible areas such as GitHub or client-side code.',
      },
      apiKeyBuilder: {
        title: 'MCP Config Builder',
        back: 'Go back',
        studioKeyName: 'Studio Key',
        setupAuth: {
          title: 'Add API Authentication',
          description: 'Generate a Studio Key to automatically inject it into your configurations.',
          button: 'Generate & Inject Key',
        },
        sections: {
          servers: 'Select MCP Servers',
          generated: 'Generated Configurations',
        },
        platforms: {
          vscode: 'VS Code',
          cursor: 'Cursor',
          claude: 'Claude',
          intellij: 'IntelliJ',
        },
        configCards: {
          vscode: 'VS Code Config',
          cursor: 'Cursor Config',
          claude: 'Claude Desktop',
          intellij: 'IntelliJ Config',
        },
        copy: 'Copy',
        copied: 'Copied',
        paste: 'Paste',
        pasted: 'Pasted',
        json: 'JSON',
        servers: {
          braveSearch: {
            name: 'Brave Search',
            description: 'Internet search capability',
          },
          firecrawl: {
            name: 'Firecrawl',
            description: 'Turn websites into LLM data',
          },
          browserless: {
            name: 'Browserless',
            description: 'Headless browser automation',
          },
          context7: {
            name: 'Context7',
            description: 'Contextual memory layer',
          },
        },
      },
      usage: {
        title: 'Token Usage',
        tokens: '{{formatted}} tokens',
        requests: '{{formatted}} requests',
        comingSoon: 'Coming Soon',
        totalCost: 'Total Cost',
        totalRequests: 'Total Requests',
        totalTokens: 'Total Tokens',
        promptTokens: 'Prompt Tokens',
        completionTokens: 'Completion Tokens',
        costByModel: 'Usage by Model',
        costByApiKey: 'Usage by API Key',
        dailyUsage: 'Daily Usage Tracking',
        tokenTrendLabel: 'Tokens per day',
        promptShort: 'Prompt',
        completionShort: 'Completion',
        requestsShort: 'Reqs',
        noData: 'No usage data available for this period.',
        loading: 'Loading usage data...',
        unknownApiKey: 'Unknown API key',
      },
      help: {
        title: 'Help',
        comingSoon: 'Coming Soon',
      },
      deleteKey: {
        title: 'Delete API key',
        description: 'You are about to delete "{{name}}". This action cannot be undone.',
        confirmInstruction: 'Type "{{target}}" to confirm.',
        fallbackName: 'delete',
        cancel: 'Cancel',
        confirm: 'Delete',
        deleting: 'Deleting...',
      },
      nav: {
        login: 'Login',
        home: 'Home',
        apiKeys: 'API Keys',
        apiKeyEditor: 'Config Studio',
        usage: 'Usage',
        settings: 'Settings',
        logout: 'Log out',
      },
      settings: {
        title: 'Settings',
        categories: {
          account: 'Account',
          project: 'Project',
          apiKeys: 'API Keys',
        },
        account: {
          title: 'Account settings',
          billingIdentitySection: 'Billing identity',
          billingIdentityDescription: 'The name or email associated with billing for this account.',
          billingIdentitySave: 'Save',
          billingIdentitySaving: 'Saving...',
          billingIdentitySaved: 'Saved',
          ownersSection: 'Owners & admins',
          ownersDescription: 'People who can manage this account.',
          ownersEmpty: 'No owners or admins added yet.',
          ownerAddPlaceholder: 'name@example.com',
          ownerAdd: 'Add',
          ownerRemove: 'Remove {{name}}',
          authSection: 'Authentication',
          authDescription: "Your account signs in through your organization's SSO provider.",
          authIssuerLabel: 'Identity provider',
          authUserLabel: 'Signed in as',
          policiesSection: 'Cross-project policy defaults',
          policiesUnsupported:
            'Cross-project policy defaults are not yet supported by the backend.',
          dangerSection: 'Danger zone',
          dangerDescription:
            'Deleting this account removes it and everything under it. This cannot be undone.',
          deleteAccount: 'Delete account',
        },
      },
      deleteAccount: {
        title: 'Delete account',
        description:
          'You are about to delete the account "{{name}}". This action cannot be undone.',
        confirmInstruction: 'Type "{{target}}" to confirm.',
        fallbackName: 'delete',
        cancel: 'Cancel',
        confirm: 'Delete',
        deleting: 'Deleting...',
      },
      home: {
        welcomeBack: 'Welcome back,',
        controlPlane: 'Control plane',
        greeting: 'Hello, {{name}}',
        defaultName: 'Alex Rivera',
        accountContext: 'Account {{account}}',
        accountPending: 'Account context is loading.',
        noProject: 'No project selected',
        noPlan: 'No plan',
        currentUsage: 'Current API Usage',
        usagePercent: '{{percent}}%',
        usageSummary: '{{used}} of {{total}} monthly requests',
        usageCostSummary: '${{used}} consumed since {{startDate}}',
        quickActions: {
          title: 'Quick Actions',
          newToken: 'New Token',
          endpoints: 'Endpoints',
          usageLogs: 'Usage Logs',
          support: 'Support',
        },
        scope: {
          accounts: 'Accounts',
          projects: 'Projects',
          apiKeys: 'API keys',
        },
        activeProject: {
          title: 'Active project',
          description:
            'Project boundaries control key issuance, usage rollups, model allowlists, and default limits.',
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
