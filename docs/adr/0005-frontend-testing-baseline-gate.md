# ADR 0005: Frontend testing baseline is a v2 delivery gate

## Status

Accepted

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
