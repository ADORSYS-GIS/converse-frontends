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
        project: {
          title: 'Project settings',
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
          limitsSave: 'Save limits',
          limitsSaving: 'Saving...',
          createdOn: 'Created {{date}}',
          updatedOn: 'Updated {{date}}',
          dangerSection: 'Danger zone',
          dangerDescription:
            'Deleting this project removes its API keys and usage history. This cannot be undone.',
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
          newToken: 'New Token',
          support: 'Support',
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
