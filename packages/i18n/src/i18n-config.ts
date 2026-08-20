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
      pagination: {
        page: 'Page',
        previous: 'Previous',
        next: 'Next',
      },
      // Copy for the render-time error boundaries (see
      // apps/self-service/src/components/error-boundary.tsx and its two
      // wrappers). Deliberately calm and specific rather than alarming --
      // never a raw stack trace, that's console/telemetry-only.
      errorBoundary: {
        title: 'Something went wrong',
        description:
          "We hit an unexpected error and couldn't finish loading this. Your data is safe.",
        retry: 'Try again',
        screenTitle: 'This screen ran into a problem',
        screenDescription:
          'We hit an unexpected error loading this screen. You can try again or head back to the start.',
        goHome: 'Back to start',
      },
      // Shared strings for the account/project picker (`EntityPickerField` in
      // apps/self-service/src/components/entity-picker-field.tsx, wrapping `@lightbridge/ui`'s
      // `Picker`/`PickerList`). Generic on purpose — the entity-specific label, empty-state, and
      // per-option accessibility copy stay on each screen's own namespace (apiKeys.*,
      // settings.account.*, settings.project.*) since those already existed and read naturally
      // in context ("No accounts available.", not "No items available.").
      picker: {
        searchAccounts: 'Search accounts',
        searchProjects: 'Search projects',
        noResults: 'No matches',
        selectAccount: 'Select account',
        selectProject: 'Select project',
        accountCount_one: '{{count}} account',
        accountCount_other: '{{count}} accounts',
        projectCount_one: '{{count}} project',
        projectCount_other: '{{count}} projects',
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
        // "Its expiration date stays the same" is load-bearing, not filler: `rotateApiKey`
        // preserves the key's existing `expiresAt` (`RotateApiKeyInput` has no field for the
        // caller to change it -- see `resolve_rotated_expires_at` server-side). Rotation neither
        // resets nor extends expiry, so this must say "stays the same", not "renews" or "resets".
        rotateDescription:
          'Rotating "{{name}}" issues a new secret and immediately invalidates the current one. Its expiration date stays the same -- update any client using this key with the new secret.',
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
          // Not a backend status value -- `apiKeys.status` also keys the derived-status badge
          // (see `getDerivedStatus` in `apps/self-service/src/lib/api-key-expiry.ts`), which
          // reads a key that is `status: 'active'` in the database but past its `expiresAt` as
          // "expired" rather than misreporting it as active.
          expired: 'Expired',
        },
        // Preset + custom expiration picker, shared by the create and settings/edit screens via
        // `ExpirySelector` (`apps/self-service/src/components/expiry-selector.tsx`), and the
        // expiring-soon/expired labels in the list/settings views (`api-key-expiry.ts`'s
        // `getExpiryUrgency`).
        expiry: {
          label: 'Expiration',
          thirtyDays: '30 days',
          sixtyDays: '60 days',
          ninetyDays: '90 days',
          custom: 'Custom',
          noExpiry: 'No expiry',
          customDateLabel: 'Expiration date',
          customDateInvalid: 'Enter a valid date.',
          noExpiryLabel: 'No expiry',
          expiresInDays_one: 'Expires in {{count}} day',
          expiresInDays_other: 'Expires in {{count}} days',
          expiresToday: 'Expires today',
          expiredOn: 'Expired {{date}}',
        },
        keyLabel: 'Key name',
        placeholder: 'Production',
        planLabel: 'Billing plan',
        planLoading: 'Loading plans...',
        planLoadError: "Couldn't load billing plans. Please try again.",
        planEmpty: 'No billing plans are configured.',
        planLockedNote: 'New keys are created on the free plan.',
        createForbidden:
          "Creating API keys here requires being this project's lead or its owning account.",
        createErrorGeneric: "Couldn't create the API key. Please try again.",
        save: 'Save key',
        saving: 'Saving...',
        createTitle: 'Create or Update',
        back: 'Go back',
        copy: 'Copy API key',
        copied: 'Copied!',
        createdOn: 'Created on {{date}}',
        createdSuccessfully: 'Key Created Successfully',
        yourNewKey: 'Your new API key:',
        oauth2UrlLabel: 'OAuth2 token endpoint:',
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
          budget: 'Budget',
          budgetReview: 'Budget Review',
        },
        // Shown inside the account/project picker sheet (EntityPickerField, wired through
        // usePickerSheet) only when the fetch-everything loop in useAllAccounts/useAllProjects
        // hit its page ceiling and the list it loaded is provably shorter than the server's own
        // totalCount. Deliberately not "showing X of Y" — search only covers what actually
        // loaded, so the copy says that plainly rather than implying the search is complete.
        picker: {
          truncationNotice:
            "Not everything could be loaded, so search only covers what's shown here. Contact support if you can't find what you're looking for.",
        },
        account: {
          title: 'Account settings',
          accountsLabel: 'Accounts',
          noAccounts: 'No accounts available.',
          selectAccount: 'Select account {{account}}',
          statusActive: 'Active',
          statusSuspended: 'Suspended',
          defaultQuotaSection: 'Usage tier',
          defaultQuotaDescription:
            'How much you may spend working on your own. Projects you share with others carry their own limits instead.',
          defaultQuotaSave: 'Save',
          defaultQuotaSaving: 'Saving...',
          defaultQuotaSaved: 'Saved',
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
          dangerSection: 'Danger zone',
          dangerDescription:
            'Deleting this account removes it and everything under it. This cannot be undone.',
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
          modelsRestrictedSummary_one: '1 model is allowed.',
          modelsRestrictedSummary_other: '{{count}} models are allowed.',
          modelsCatalogLoading: 'Loading the model catalogue...',
          modelsCatalogError:
            'The model catalogue is unavailable right now. Try again later to change which models are allowed.',
          modelsCatalogEmpty: 'No models are configured in the catalogue yet.',
          modelUnknownBadge: 'No longer in catalogue',
          allowlistEnforcedNotice:
            'Heads up: this allowlist is now enforced. Calls to models not on this list will be rejected. Currently allowed: {{models}}.',
          allowlistEnforcedDismiss: 'Got it',
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
          membersSection: 'Members',
          membersDescription:
            'People who share this project. Leads can manage the roster and set each member\u2019s spending ceiling.',
          membersDefaultProject:
            'This is your personal project \u2014 it has no members by design. Create a separate project to work with others.',
          membersEmpty: 'No members yet. Add someone by their account ID.',
          memberRoleLead: 'Lead',
          memberRoleMember: 'Member',
          memberPromote: 'Make lead',
          memberDemote: 'Make member',
          memberQuotaPlaceholder: 'Usage tier (e.g. t-m)',
          memberQuotaSave: 'Save tier',
          memberRemove: 'Remove {{name}}',
          memberRemoveLabel: 'Remove',
          memberAddPlaceholder: 'Account ID',
          memberAdd: 'Add member',
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
        // API key settings (#55's remaining scope). Per ADR 0001's "Settings" section this
        // covers name, expiration, last-used metadata, revoke/delete, and (future) rotation.
        // `UpdateApiKeyInput` on the wire is `{ name, expiresAt }` only (see the `@readonly`
        // fields documented on `model ApiKey` in packages/authz-rpc/schema/authz.cstack) — every
        // other field below (status, key prefix, last used, last IP, billing plan, revoked/created
        // dates) is rendered read-only because the backend has no mutation for it, not because of
        // a UI choice. Rotation reuses the existing API Keys list screen instead of a duplicate
        // control here, matching the ADR's "reserve room, don't duplicate" framing.
        apiKey: {
          title: 'API key settings',
          subtitle: 'Manage the name, expiration, and lifecycle of a single API key.',
          accountsLabel: 'Accounts',
          projectsLabel: 'Projects',
          noAccounts: 'No accounts available.',
          noProjects: 'No projects in this account yet.',
          selectAccount: 'Select account {{account}}',
          selectProject: 'Select project {{project}}',
          keysLabel: 'API keys',
          noKeys: 'No API keys in this project yet.',
          selectKey: 'Select key {{name}}',
          noKeySelected: 'Select an API key above to view its settings.',
          detailsSection: 'Key details',
          detailsDescription: 'The name and expiration date for this key.',
          nameLabel: 'Key name',
          namePlaceholder: 'production-server',
          detailsSave: 'Save',
          detailsSaving: 'Saving...',
          metadataSection: 'Lifecycle metadata',
          metadataDescription: "Reported by the server — this key's own settings can't change it.",
          statusLabel: 'Status',
          keyPrefixLabel: 'Key prefix',
          billingPlanLabel: 'Billing plan',
          lastUsedLabel: 'Last used',
          lastIpLabel: 'Last used from',
          noLastIp: 'No requests recorded yet',
          createdLabel: 'Created',
          revokedLabel: 'Revoked',
          rotationSection: 'Rotation',
          rotationDescription:
            'Rotating a key issues a new secret and immediately invalidates the current one. Its expiration date stays the same.',
          rotationNote: 'Rotate this key from the API Keys list, alongside its other actions.',
          goToApiKeys: 'Go to API Keys',
          dangerSection: 'Danger zone',
          dangerDescription:
            'Revoke disables the key immediately but keeps its record for auditing. Delete removes the key and its history permanently — this cannot be undone.',
          revokedNotice: 'This key has already been revoked.',
          // Shown alongside `revokedNotice` when the key is `status: 'active'` in the database
          // but past its `expiresAt` -- distinct wording because unlike a revoke, this state is
          // fixable from this same screen (extend or clear the expiration above).
          expiredNotice:
            'This key expired and can no longer authenticate requests. Extend or clear its expiration above to restore it.',
        },
        // Self-service budget refill (#148, ADR-0015 amount picker). "Budget tier" is
        // deliberately never called "quota tier" anywhere in this block -- `project.quotaTier`
        // (roster, per-member request-rate ceiling) and this "budget tier" (per-account monthly
        // spend ceiling) are unrelated fields that would both read as "tier" in support tickets
        // if the copy collided.
        // ADR-0015 (lightbridge-authz#386) reversed the "caller chooses nothing" model this block
        // was originally written under: `amount*` keys below back a real `SegmentedControl`
        // picker sourced from `getMyBudgetRefillLadder`'s `allowedAmountsMicros`, the live,
        // admin-configured set the active policy currently offers. The pre-ADR-0015
        // ladder-visibility panel ("you are here, this is next") and its `ladder*` keys were
        // removed -- under a flat, admin-configured amount set there is no ladder *position* left
        // to display (see the frontend PR that deleted `LadderVisibilityPanel`). `submitWithAmount`
        // names the chosen amount in the button but is deliberately NOT a promise: policy still
        // decides auto-approve vs. admin review vs. denial, so the copy states what is being
        // requested, never what will be granted -- `requestedTierLabel` still reveals the
        // server-assigned outcome AFTER a decision, unchanged.
        budget: {
          title: 'Budget refill',
          subtitle: "Request an increase to your account's monthly spending ceiling.",
          // Non-negotiable per the maintainer: this must be visible whether or not the caller has
          // ever submitted a refill, not only after one. Plain and factual, no jargon -- someone
          // who refills, sees no change, and concludes the product is broken is worse than someone
          // who was told up front. See docs/budget-refill-ui-contract.md's Phase 6a/6b note in
          // lightbridge-authz for the underlying gap this describes.
          enforcementGapNotice:
            "Refill requests are recorded here, but they don't change your enforced usage limit yet — that connection to the request gateway hasn't been built.",
          requestSection: 'Request a refill',
          requestSectionDescription:
            "Choose an amount to request. Your account's budget policy still decides whether it's granted automatically or sent for admin review.",
          periodLabel: 'For {{period}}',
          amountLabel: 'Amount',
          amountLoading: 'Loading refill amounts…',
          amountLoadError: "Couldn't load refill amounts.",
          amountEmpty:
            "Your account's budget policy doesn't currently offer any refill amounts. Contact an admin.",
          submit: 'Request a refill',
          // Names the amount that will be REQUESTED, never implies it's guaranteed -- see the
          // module comment above and budget-refill-view.tsx's `submitLabel`.
          submitWithAmount: 'Request {{amount}}',
          submitting: 'Requesting…',
          permissionDenied: "You don't have permission to request a budget refill.",
          // Non-negotiable per the ticket: never implies the new amount is usable right now, and
          // names the concrete mechanism (a silent, refresh-token-based token refresh — see
          // packages/authz-rpc/src/runtime.ts's proactive-refresh/401-retry logic and
          // packages/hooks/src/auth/use-auth-session.ts's `refreshAuth` wiring) rather than
          // leaving "next refresh" abstract. No re-login is required for this to take effect.
          tokenRefreshNotice:
            "Granted. This takes effect the next time your access token silently refreshes in the background — not immediately, and you won't need to log in again.",
          requestedTierLabel: 'Requested tier: {{amount}}',
          approvedAmountLabel: 'Approved amount: {{amount}}',
          pendingReview:
            "This request is under review by an admin. There's no estimated time for a decision.",
          deniedGenericReason: 'This request was denied. Contact support if you have questions.',
          // Best-effort copy for `policyReasonCodes` when a request is denied automatically (no
          // `rejectionReason`). Not a verified exhaustive list of the backend's reason-code enum
          // — see the code comment on DENIED_REASON_CODE_I18N_KEYS in budget-refill-view.tsx.
          deniedReasonCodes: {
            self_service_disabled: 'Self-service refills are currently disabled for your account.',
            account_suspended: "Your account is suspended, so refill requests can't be processed.",
            policy_denied: "This request doesn't meet the current budget policy.",
          },
          retry: 'Retry',
          retryHint:
            "Something went wrong sending this request. Retrying reuses the same request so it won't be processed twice.",
        },
        budgetReview: {
          title: 'Budget review queue',
          subtitle: 'Pending self-service budget refill requests awaiting an admin decision.',
          permissionDenied: "You don't have permission to review budget requests.",
          empty: 'No pending requests. New requests that need review will show up here.',
          statusPending: 'Pending review',
          requestedLabel: 'Requested {{amount}}',
          requestedFor: 'Account {{accountId}}',
          periodLabel: 'Period {{period}}',
          createdOn: 'Submitted {{date}}',
          approve: 'Approve',
          approving: 'Approving…',
          approveNamed: 'Approve request {{id}}',
          reject: 'Reject',
          rejecting: 'Rejecting…',
          rejectNamed: 'Reject request {{id}}',
          reasonPlaceholder: 'Reason for the requester (required)',
          reasonRequired: 'A reason is required before you can reject.',
        },
      },
      createProject: {
        title: 'New project',
        description: 'Projects group API keys, model access, and usage under one boundary.',
        nameLabel: 'Project name',
        namePlaceholder: 'Production',
        billingIdentityLabel: 'Billing identity',
        billingIdentityPlaceholder: 'Who is paying — name, email, or client reference',
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
