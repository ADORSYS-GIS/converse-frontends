# User Bootstrap Documentation

This document explains the silent bootstrap flow implemented to ensure every user has a default account and project before they interact with features like API key creation.

## Overview

The backend requires an `accountId` to create a `projectId`, and a `projectId` to create an `apiKey`. To provide a seamless "one-click" experience for new users, the frontend automatically handles the creation of these entities if they don't exist.

## Implementation Details

### Bootstrap Sequence

When a user attempts to create an API key (in `ApiKeyCreateScreen` or `McpBuilderScreen`), the folgenden sequence is executed:

1.  **`ensureAccount()`**: Calls `useEnsureDefaultAccount`.
    *   Checks if any accounts exist for the user (`GET /api/v1/accounts`).
    *   If none exist, creates one (`POST /api/v1/accounts`) using Keycloak session data (`email` -> `billing_identity`).
    *   Returns the `accountId`.
2.  **`ensureProject(accountId)`**: Calls `useEnsureDefaultProject`.
    *   Checks if any projects exist for the given `accountId` (`GET /api/v1/accounts/{id}/projects`).
    *   If none exist, creates one (`POST /api/v1/accounts/{id}/projects`) with a default name (e.g., "Default Project").
    *   Returns the `projectId`.
3.  **`createKey({ name }, projectId)`**: The actual API key creation is then called with the resolved `projectId`.

### Hooks

-   **`useEnsureDefaultAccount`** (`packages/hooks/src/accounts.ts`): Mutation hook that wraps the check-and-create logic.
-   **`useEnsureDefaultProject`** (`packages/hooks/src/projects.ts`): Mutation hook that wraps the check-and-create logic for projects.
-   **`useCreateApiKey`** (`packages/hooks/src/api-keys.ts`): Refactored to accept an optional `projectId` override to avoid race conditions with the query cache.

## UI Logic & Refinements

### MCP Config Builder
To reduce header congestion and improve clarity, the "Generate & Inject Key" action is now contained within a dedicated **Authentication Setup** card.
- This card is only visible if a `generatedSecret` is not already present.
- It provides a clear call-to-action to generate a Studio Key that is automatically injected into the generated configurations.

### TextField Styling
- All API Key creation `TextField` components now use `selectionColor={colors.primary}` (Blue) to ensure consistent branding and avoid the default system highlight (Orange).

## How to Modify

-   **Default Project Name**: Update the `project.defaultName` key in `packages/i18n/src/i18n-config.ts`.
-   **Billing Plan**: The default plan is set to `'free'` in `useEnsureDefaultProject`. Modify this in `packages/hooks/src/projects.ts` if needed.
-   **Billing Identity**: Defaults to `user.email ?? user.name ?? user.id`. Modify this in `useEnsureDefaultAccount` in `packages/hooks/src/accounts.ts`.

## Wiremock

The stubs for account and project creation are located in `wiremock/mappings/mapping.json`. When testing bootstrap logic locally, ensure these stubs match the expected response shape (see `ApiKeyBackendAccount` and `ApiKeyBackendProject` types).
