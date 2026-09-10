# ADR 0005: Frontend testing baseline is a v2 delivery gate

## Status

Accepted — **amended 2026-09-03: accessibility joins the baseline gate** (owner directive, issue
[#443](https://github.com/ADORSYS-GIS/converse-frontends/issues/443)).

This ADR's "Consequences" listed visual regression and broader coverage as explicitly out of scope,
to follow "once the harness is proven." The harness is proven — 3171 tests across five DOM
workspaces, a failing CI gate on every one — and the first extension to land is accessibility, on
the same terms this ADR set for tests: a **failing** gate, not a report.

Three layers, none of them optional, all wired into the same `pnpm lint` / `pnpm test` / CI checks
this ADR established:

1. `eslint-plugin-jsx-a11y` at `error` for every DOM workspace, in the shared `eslint.config.js`.
2. `axe-core` (WCAG 2.1 AA) in an automatic `afterEach`, so **every render test is also an
   accessibility test** with no assertion to remember — the same "no manual claims" principle this
   ADR applied to verification evidence.
3. `@storybook/addon-a11y` with `parameters.a11y.test = 'error'`, every story in real Chromium in
   both themes, in its own CI job — the one place colour contrast can be measured.

What this ADR said about evidence now reads across unchanged: an accessibility claim on a PR means
a green gate, not an assertion that someone looked at the addon panel.

Full stack, exceptions policy and the measured findings:
`docs/knowledge/accessibility.md`.

## Context

The repository adopted the AI Governance kit in ADR 0002. Governance requires that every ticket and pull request provide **verification evidence** and that "relevant tests are added or updated" as acceptance criteria.

At the start of v2 planning the repository contained **zero test files** (`find . -name '*.test.*' -o -name '*.spec.*'`, excluding `node_modules`, returns nothing) and no `pnpm test` script or CI test gate. This is a direct contradiction: governance demands test evidence on work that has no harness to produce it. Every other v2 ticket (#53–#59) carries a "relevant tests added" acceptance criterion that cannot be satisfied today.

The stack is an Expo + React Native Web monorepo on pnpm workspaces, which makes native-transform configuration the main setup risk.

## Decision

A **frontend testing baseline is a prerequisite (Phase 0) for v2** and a standing delivery gate thereafter.

- Adopt the Expo-recommended runner (Jest) plus `@testing-library/react-native`.
- Provide a `pnpm test` script that runs across workspaces and wire it into CI as a **failing** gate.
- Seed the suite with high-value pure logic first — `buildConfig` (MCP builder), the date formatters (API keys list), usage totals/formatting — plus one primitive smoke render, to avoid blocking on native-transform config.
- After the baseline lands, "verification evidence" on subsequent PRs means real test output / CI links, not manual claims alone.

## Consequences

- v2 sequences this **before** feature work (#53–#59) because those tickets' acceptance criteria depend on it.
- CI gains a test gate; a red test blocks merge, consistent with the deterministic governance check from ADR 0002.
- The baseline is intentionally minimal (pure logic + one render). Broader coverage, e2e/Detox, and visual regression are explicitly out of scope and follow once the harness is proven.
- Tracked by issue #57.
