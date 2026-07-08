# ADR 0006: `@expo/ui` is not adopted; web-viable primitives are used instead

## Status

Accepted

## Context

This product is built with Expo + React Native but **ships as a pure web app** (React Native Web). During a UI review, the team asked whether to lean on Expo's `@expo/ui` universal components — `BottomSheet`, `Spacer`, `Checkbox`, `ScrollView` — motivated by two real rough edges in the current components: no first-class bottom-sheet primitive, and an unstyled-looking checkbox (the plain `expo-checkbox` web fallback).

The Expo documentation that describes these universal components is at `docs.expo.dev/versions/latest/sdk/ui/universal/…` — i.e. the **latest** SDK docs. This app is on **Expo SDK 55**. The published `@expo/ui` packages were inspected directly (via `npm view … exports`) to check what our version actually provides, rather than assuming the docs apply.

Findings (each verifiable from the published packages):

1. **On SDK 55, the universal components do not exist and there is no web entry point.** `@expo/ui@55.0.17` (the `sdk-55`-tagged release) exports only `./swift-ui` (iOS), `./jetpack-compose` (Android), `./datetimepicker`, and `./community/segmented-control`. There is no universal (`.`) export and no web condition anywhere — a web-only app cannot import a usable component from it.
2. **`BottomSheet` / `Spacer` / the universal `Checkbox` were introduced in SDK 56.** The universal root export (`.`) and `./community/bottom-sheet` first appear in `@expo/ui@56`. Reaching them requires an Expo **SDK 55 → 56/57 upgrade** — a separate, larger migration, not a UI change.
3. **Even in the latest release, web support is minimal.** In `@expo/ui@57.0.4` the entire package ships exactly one `.web.tsx` file (`DateTimePicker.web.tsx`); the universal `Host`/`BottomSheet`/`Spacer`/`Checkbox` have no dedicated web implementation. This is consistent with Expo's own "experimental" labeling of the web target and is not a foundation to build a web-first product on yet.

## Decision

**Do not adopt `@expo/ui` for this app at this time.** Meet the underlying needs with web-proven tools instead:

- **Bottom sheet** → `@gorhom/bottom-sheet` (web-capable; built on `react-native-reanimated`, already a dependency). This is the mature library that Expo itself re-wraps under `@expo/ui/community/bottom-sheet`.
- **Checkbox** → restyle the existing checkbox (or a thin custom control over a native `<input>`); this is a styling gap, not a missing-primitive problem, and needs no new dependency.

`NativeWind` is **not** implicated in either issue and is retained — the components that rely on it render correctly; the checkbox problem is `expo-checkbox`'s web fallback, and the font/asset issues addressed separately were asset-loading, not styling.

## Consequences

- Reconsidering `@expo/ui` is **gated on an Expo SDK 55 → 56/57 upgrade** and on its web target maturing past experimental. Tracked as a future decision, not scheduled here.
- The `@expo/ui` pilot (issue #71) is closed as **no-go**, with this ADR as its verification evidence and decision record.
- Follow-up work is tracked separately: a `@gorhom/bottom-sheet` spike on one modal flow (new ticket) and the checkbox restyle (folds into the component-revamp ticket #72).
- Investigation cost was deliberately kept to package-metadata inspection — no dependency was installed and no code was written, because the SDK-55 blocker is decisive on its own.
