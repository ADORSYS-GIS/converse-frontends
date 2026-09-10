# Implementation Plan - UI fixes and Account Management

This plan outlines the changes needed to address the layout, scrolling, support header, and account/project management issues reported.

**Status: ✅ Complete.** All items implemented and verified (typecheck clean, 88 tests pass incl. 3 new, ESLint/Prettier clean, scroll fix confirmed live in-browser at desktop and mobile widths).

## Notes / Decisions

- Account selection and creation were added to the Account settings screen, behaving like the Project settings screen (URL-backed `?accountId=` selection + a create sheet).
- A new modal sheet `CreateAccountSheet` presents `CreateAccountView` and invokes the `useCreateAccount` mutation (backed by `apiKeyBackendCreateAccount`).
- **Project membership:** confirmed with the backend that there is _no_ project-level membership — members/owners are defined only at the Account level. No project-members UI is needed; account members remain managed in Account Settings.

## Changes

---

### UI / Layout and Scroll Fixes

#### [x] [global.css](apps/self-service/global.css)

- Restricts `html`, `body`, `#root`, and the React root element to full size with hidden overflow and `overscroll-behavior: none`, preventing viewport-level rubber-banding and sideways scroll.
- **Verified live:** on desktop (1280px) and mobile (375px), `scrollWidth === clientWidth` (no horizontal scroll) and `overflow: hidden` / `overscroll-behavior: none` are applied.

---

### Support/Help Page Header Consistency

#### [x] [help.tsx](apps/self-service/src/app/help.tsx)

- Hides the default white native navigation header (`headerShown: false`).

#### [x] [help-screen.tsx](apps/self-service/src/screens/help-screen.tsx)

- Passes an `onBack` handler (`router.back()`) to the view.

#### [x] [help-view.tsx](apps/self-service/src/views/help-view.tsx)

- Wraps content in a consistent themed `Div` + `PageHeader` with a back button, matching the other pages' colours and shape.
- Fixed an unbalanced JSX tree (missing closing `</Div>`) introduced during this work.

---

### Project Settings Header Consistency on Desktop

#### [x] [project-settings-view.tsx](apps/self-service/src/views/settings/project-settings-view.tsx)

- When embedded (desktop: `showBackButton` false), the "New project" button now renders next to the title instead of being hidden, so the create action is consistent across mobile/desktop/resize.

---

### Account Selection and Creation

#### [x] [accounts.ts](packages/hooks/src/accounts.ts)

- Added and exported the `useCreateAccount` mutation hook.

#### [x] [create-account-view.tsx](apps/self-service/src/views/create-account-view.tsx)

- Form for entering a new account's billing identity.

#### [x] [create-account-sheet.tsx](apps/self-service/src/screens/create-account-sheet.tsx)

- Bottom sheet presenting `CreateAccountView` and invoking `useCreateAccount`.

#### [x] [account-settings-screen.tsx](apps/self-service/src/screens/account-settings-screen.tsx)

- Refactored from `useCurrentAccount` to `useAccounts` + URL-backed `?accountId=` selection; handles account creation/selection and gates the create action on `account:create`.

#### [x] [account-settings-view.tsx](apps/self-service/src/views/settings/account-settings-view.tsx)

- Added an account selector card plus a create button in the header (mobile) and inline (desktop), gated on `canCreate`.

#### [x] [i18n-config.ts](packages/i18n/src/i18n-config.ts)

- Added English strings for account selection and creation.

## Verification

### Automated

- `pnpm test` (self-service): 21 suites / 88 tests pass, including 3 new account-settings-view tests (list select, create button, permission gating).
- `tsc --noEmit` clean for app source; ESLint + Prettier clean on changed files.

### Manual

- Scroll/overflow fix verified live in-browser (desktop + mobile): no rubber-banding, no horizontal scroll.
- Support header, project-settings desktop create button, and account create/switch: covered by tests and typecheck. Live click-through was not possible in the CI-like environment (no backend/Keycloak — `localhost:9100` refuses the OIDC discovery request, so auth bootstrap can't complete). Recommend a quick manual pass against a running backend stack.
