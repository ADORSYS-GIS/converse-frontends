# ADR 0001: Self-Service account, project, and API key UX

## Status

Accepted

## Context

The backend OpenAPI specs define a strict hierarchy:

- Accounts are listed and managed at `/api/v1/accounts`.
- Projects belong to accounts at `/api/v1/accounts/{account_id}/projects`.
- API keys belong to projects at `/api/v1/projects/{project_id}/api-keys`.
- Usage can be queried at `user`, `api_key`, `project`, and `account` scopes through `/usage/v1/usage/query`.

API key records expose lifecycle metadata: `status`, `key_prefix`, `created_at`, `last_used_at`, `last_ip`, `expires_at`, and `revoked_at`. Key creation and rotation return a one-time `secret`; list responses only return metadata.

Refero references used:

- Style: [OpenAI Developers Refero preview](https://images.refero.design/styles/developers.openai.com/44317718-1e56-45e0-8de3-7ede70f34349/preview_0.jpg), with [source site](https://developers.openai.com), for calm developer hierarchy and restrained cards.
- Style: [Fingerprint Refero preview](https://images.refero.design/styles/fingerprint.com/74adbdf2-822b-4df3-80d1-3c5a1b263a90/preview_0.jpg), with [source site](https://fingerprint.com), for compact security/data panels and single-accent discipline.
- Style: [shadcn/ui Refero preview](https://images.refero.design/styles/ui.shadcn.com/c14c0a94-1037-449e-bf5b-4cb972656ac7/preview_0.jpg), with [source site](https://ui.shadcn.com), for table-first monochrome product UI.
- Flow: [Gladia API key deletion](https://refero.design/flows/10901) as the preferred product-flow reference because its developer-console structure, compact key list, copy/delete row actions, and typed destructive confirmation fit this product best.
- Flow and UI components: [Cohere create trial API key](https://refero.design/flows/3885) for API-key management building blocks: required naming, sectioned key tables, one-time secret display, copy control, and return to list.
- Settings reference: [Parallel settings](https://refero.design/pages/681959a2-72c1-4dd1-835c-bec45abf122e) for compact developer-console settings with cards, tabs, switches, and currency/billing affordances.
- Settings reference: [Factory billing settings](https://refero.design/pages/ea223a26-b4a4-47b3-be1a-0e36ce7848b7) for usage/billing settings that combine plan context, progress, and account controls.

The style links point to Refero-hosted previews because Refero style search exposes preview images and source URLs, not a human-facing style detail page. The flow links point to human-facing Refero flow pages.

## Decision

Self-Service will treat account and project context as first-class navigation state. API keys will not be shown as a global flat list.

The implementation will stay mobile-first because Self-Service is an Expo app rendered on web. Desktop web layouts should feel elegant and control-plane capable, but they must be responsive expansions of the same mobile-first design system rather than a separate desktop-only admin UI.

The visual and interaction priority is:

1. Gladia for the overall developer-console flow and key lifecycle behavior.
2. Cohere for API-key UI items such as sectioned key lists, naming forms, one-time secret display, and row actions.
3. OpenAI/Fingerprint/shadcn style references only as restraint, density, and surface-treatment guidance.

Grouped controls should borrow Cohere's compact segmented structure, but separators should be diagonal cuts instead of traditional vertical hairlines. This applies to tight action groups such as copy/rotate/revoke, period toggles, and settings tabs. On narrow mobile widths, grouped controls may wrap or collapse into a sheet/menu; the diagonal separator should not force unreadable labels.

The main dashboard will show:

- Current account identity.
- Counts for accounts, projects, and active project API keys.
- Active project summary.
- Usage summary and existing route shortcuts.

The API key view will show:

- Account selector.
- Project selector scoped to the selected account.
- Current project metadata.
- Project-scoped API key rows with status, prefix, creation date, last-used state, and expiration state.
- Key creation routed with the selected `projectId`.
- Typed confirmation for destructive key removal.

The create-key flow remains a focused form:

1. User starts from a selected project.
2. User enters a key name.
3. Backend returns `ApiKeySecret.secret`.
4. UI shows the secret once with copy affordance.
5. Returning to the list preserves the selected project.

## Settings

Settings should be scoped by the same hierarchy as the backend:

- Account settings: billing identity, owners/admins, authentication context, and cross-project policy defaults.
- Project settings: project name, billing plan, allowed models, default limits, budget, and danger-zone actions.
- API key settings: name, expiration, last-used metadata, revoke/delete, and future rotation.

Settings should be presented as a mobile-first stack of dense sections. Desktop may render a two-pane settings layout with a left category rail and a right detail panel, but mobile remains the base model: category list first, then a focused settings detail screen.

Project budget belongs in Project settings, not global account settings. The product meaning is: "how much this project is allowed to spend or consume before warning, throttling, or blocking." This keeps budget close to project-scoped usage, API keys, model allowlists, and default rate limits.

Budget controls should include:

- Budget amount and currency.
- Budget period: daily, monthly, or billing-cycle.
- Warning threshold, for example 80%.
- Enforcement mode: notify only, throttle, or block.
- Current spend and remaining budget using the usage API.

The current backend does not expose a first-class project budget field. It only exposes `billing_plan`, `allowed_models`, and `default_limits` (`concurrent_requests`, `requests_per_day`, `requests_per_second`). Therefore, the first backend-compatible implementation can expose default limits as the operational budget. Monetary project budgets require a backend contract addition before the UI can persist them.

## Consequences

This breaks the previous assumption that the first account and first project are always the whole workspace. It also makes the existing default-account/default-project bootstrap a fallback only for missing context.

Usage remains project-defaulted in code for now, but the UI and backend model establish the future flow: a shared scope selector can query usage at account, project, API key, or user scope.

API key rotation is intentionally not exposed yet, even though the backend supports `POST /api/v1/api-keys/{key_id}/rotate`. The row layout reserves room for lifecycle actions so rotation can be added without changing the screen structure.

The backend supports both delete and revoke. The current implementation still calls delete because that is the existing hook and route behavior. A follow-up should decide whether Self-Service should prefer revoke for auditability and only expose delete for cleanup/admin use.
