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
        revoke: 'Revoke',
        revokeNamed: 'Revoke {{name}}',
        revokeConfirmTitle: 'Revoke this key?',
        revokeConfirmMessage:
          'Revoking "{{name}}" disables it immediately and cannot be undone from here. Requests using its current secret will start failing right away.',
        revokeCancel: 'Cancel',
        revoking: 'Revoking...',
        revokeSuccess: 'Key Revoked',
        revokeDone: 'Done',
        rotate: 'Rotate',
        rotateNamed: 'Rotate {{name}}',
        rotateTitle: 'Rotate API key',
        rotateDescription:
          'Rotating "{{name}}" issues a new secret and immediately invalidates the current one. Update any client using this key with the new secret.',
        rotateConfirm: 'Rotate key',
        rotateCancel: 'Cancel',
        rotating: 'Rotating...',
        rotateSuccess: 'Key Rotated Successfully',
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
        keyPrefixLabel: 'Prefix',
        lastUsed: 'Last used {{date}}',
        neverUsed: 'Never used',
        expiresOn: 'Expires {{date}}',
        status: {
          active: 'Active',
          revoked: 'Revoked',
        },
        keyLabel: 'Key name',
        placeholder: 'Production',
        planLabel: 'Billing plan',
        planPlaceholder: 'free',
        planLockedNote: 'New keys are created on the free plan.',
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
      help: {
        title: 'Help',
        comingSoon: 'Coming Soon',
        resourcesTitle: 'Resources',
        resourcesDescription:
          'Guides, references, and tools to help you integrate and troubleshoot.',
        docs: 'API Documentation',
        docsDescription: 'Full REST API reference with examples.',
        keysGuide: 'API Key Management',
        keysGuideDescription: 'Learn how to create, rotate, and revoke keys.',
        contactSupport: 'Contact Support',
        contactSupportDescription: 'Reach our team for account or billing issues.',
        faqTitle: 'Frequently asked questions',
        faqRotate: 'What happens when I rotate a key?',
        faqRotateAnswer:
          'Rotation issues a new secret and immediately invalidates the old one. Update any client using this key with the new secret right away.',
        faqRevoke: 'What is the difference between revoke and delete?',
        faqRevokeAnswer:
          'Revoking marks a key as inactive — requests using its secret will fail, but the key record remains for audit. Deleting removes the key entirely.',
        faqProject: 'How do projects scope API keys?',
        faqProjectAnswer:
          'Each API key belongs to a single project. The project determines which models the key can access and what rate limits apply.',
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
        usage: 'Usage',
        settings: 'Settings',
        logout: 'Log out',
      },
      usage: {
        title: 'Usage',
        openExternal: 'Open in Grafana',
        native: {
          title: 'View your usage',
          description:
            'Your usage dashboard opens in the browser, signed in with the same account.',
        },
        unavailable: {
          title: 'Usage analytics unavailable',
          description: 'Usage analytics have not been configured for this environment yet.',
        },
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
          accountsLabel: 'Accounts',
          noAccounts: 'No accounts available.',
          selectAccount: 'Select account {{account}}',
          newAccount: 'New account',
          statusActive: 'Active',
          statusSuspended: 'Suspended',
          billingIdentitySection: 'Billing identity',
          billingIdentityDescription: 'The name or email associated with billing for this account.',
          billingIdentitySave: 'Save',
          billingIdentitySaving: 'Saving...',
          billingIdentitySaved: 'Saved',
          ownersSection: 'Members',
          ownersDescription:
            "People who can manage this account, identified by their identity provider's subject ID (not their email).",
          ownersEmpty: 'No members added yet.',
          ownerAddPlaceholder: 'Subject ID (e.g. 7fd91a54-0443-...)',
          ownerAdd: 'Add',
          ownerRemove: 'Remove {{name}}',
          authSection: 'Authentication',
          authDescription: "Your account signs in through your organization's SSO provider.",
          authIssuerLabel: 'Identity provider',
          authUserLabel: 'Signed in as',
          policiesSection: 'Cross-project policy defaults',
          policiesUnsupported:
            'Cross-project policy defaults are not yet supported by the backend.',
          suspendSection: 'Suspension',
          suspendDescription:
            'Suspending an account blocks every API key beneath it from validating, without deleting anything.',
          suspendAccount: 'Suspend account',
          suspending: 'Suspending...',
          enableAccount: 'Reactivate account',
          enabling: 'Reactivating...',
          defaultSection: 'Default account',
          defaultDescription:
            'Your default account cannot be permanently deleted. Promote this account to free up your current default for deletion.',
          defaultDescriptionCurrent:
            'This is your default account. It cannot be permanently deleted until another account is promoted.',
          defaultBadge: 'Default',
          setDefault: 'Set as default',
          settingDefault: 'Setting as default...',
          dangerSection: 'Danger zone',
          dangerDescription:
            'Deleting this account removes it and everything under it. This cannot be undone.',
          dangerDescriptionDefault:
            'This is your default account and cannot be permanently deleted. Set another account as default first.',
          deleteAccount: 'Delete account',
        },
        project: {
          title: 'Project settings',
          statusActive: 'Active',
          statusSuspended: 'Suspended',
          scopeEyebrow: 'Account / project scope',
          subtitle: 'Manage project identity, plan, model access, and default limits.',
          accountsLabel: 'Accounts',
          projectsLabel: 'Projects',
          noAccounts: 'No accounts available.',
          noProjects: 'No projects in this account yet. Create one to get started.',
          selectAccount: 'Select account {{account}}',
          selectProject: 'Select project {{project}}',
          newProject: 'New project',
          loading: 'Loading projects...',
          detailsSection: 'Project details',
          detailsDescription: 'The name and billing plan for this project.',
          nameLabel: 'Project name',
          namePlaceholder: 'Production',
          planLabel: 'Billing plan',
          planPlaceholder: 'free',
          detailsSave: 'Save',
          detailsSaving: 'Saving...',
          modelsSection: 'Allowed models',
          modelsDescription:
            'Models that API keys in this project may call. Leave empty to allow all models.',
          modelsEmpty: 'All models are allowed.',
          modelAddPlaceholder: 'gpt-4o, claude-sonnet-5, ...',
          modelAdd: 'Add',
          modelRemove: 'Remove {{name}}',
          limitsSection: 'Default limits',
          limitsDescription:
            'Default rate limits applied to new API keys in this project. Leave a field empty for no limit.',
          limitRps: 'Requests per second',
          limitRpd: 'Requests per day',
          limitConcurrent: 'Concurrent requests',
          limitRpsPlaceholder: 'e.g. 10',
          limitRpdPlaceholder: 'e.g. 10000',
          limitConcurrentPlaceholder: 'e.g. 5',
          limitsSave: 'Save limits',
          limitsSaving: 'Saving...',
          createdOn: 'Created {{date}}',
          updatedOn: 'Updated {{date}}',
          suspendSection: 'Suspension',
          suspendDescription:
            'Suspending a project blocks every API key in it from validating, without deleting anything.',
          suspendProject: 'Suspend project',
          suspending: 'Suspending...',
          enableProject: 'Reactivate project',
          enabling: 'Reactivating...',
          defaultSection: 'Default project',
          defaultDescription:
            'Your account’s default project cannot be permanently deleted. Promote this project to free up the current default for deletion.',
          defaultDescriptionCurrent:
            'This is your account’s default project. It cannot be permanently deleted until another project is promoted.',
          defaultBadge: 'Default',
          setDefault: 'Set as default',
          settingDefault: 'Setting as default...',
          dangerSection: 'Danger zone',
          dangerDescription:
            'Deleting this project removes its API keys and usage history. This cannot be undone.',
          dangerDescriptionDefault:
            'This is your account’s default project and cannot be permanently deleted. Set another project as default first.',
          deleteProject: 'Delete project',
        },
      },
      createProject: {
        title: 'New project',
        description: 'Projects group API keys, model access, and usage under one boundary.',
        nameLabel: 'Project name',
        namePlaceholder: 'Production',
        planLabel: 'Billing plan',
        planPlaceholder: 'free',
        cancel: 'Cancel',
        create: 'Create project',
        creating: 'Creating...',
      },
      deleteProject: {
        title: 'Delete project',
        description:
          'You are about to delete the project "{{name}}". This action cannot be undone.',
        confirmInstruction: 'Type "{{target}}" to confirm.',
        fallbackName: 'delete',
        cancel: 'Cancel',
        confirm: 'Delete',
        deleting: 'Deleting...',
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
      createAccount: {
        title: 'New account',
        description: 'Accounts scope billing, project defaults, and user access.',
        billingIdentityLabel: 'Billing identity',
        billingIdentityPlaceholder: 'Billing name or email',
        cancel: 'Cancel',
        create: 'Create account',
        creating: 'Creating...',
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
        quickActions: {
          title: 'Quick actions',
          newToken: 'New Token',
          manageKeys: 'Manage API Keys',
          settings: 'Settings',
          support: 'Support',
        },
        gettingStarted: {
          title: 'Getting started',
          createKey: 'Create your first API key',
          manageProject: 'Configure your project',
          reviewSettings: 'Review account settings',
        },
        activeProject: {
          title: 'Active project',
        },
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
