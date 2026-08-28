# ADR 0012: LCI app scaffolding — name, chart, and the code-graph decision

## Status

Proposed.

Applies under [ADR 0008](0008-console-shell-inversion-and-visual-direction.md)'s locked visual
direction and [ADR 0010](0010-ui-primitive-stack-and-theming.md)'s primitive stack. Neither is
re-decided here — this ADR only settles what is specific to bringing
`lightbridge-code-intelligence`'s UI into this monorepo as a new app: its name, its deployment
identity, and how its one genuinely novel surface (the code graph) gets built.

Companion document: [`docs/design/lci-app/PRIMITIVES.md`](../design/lci-app/PRIMITIVES.md) — the
per-primitive gap list this ADR's decisions feed into.

## Context

The new app is scoped by the epic
([converse-frontends#328](https://github.com/ADORSYS-GIS/converse-frontends/issues/328)) to reuse
`packages/ui-web` and `packages/chart-core`, sit beside `apps/console`, and inherit ADR 0008/0010
without re-litigating them. Two things are not yet decided anywhere:

1. **What the app and its deployment artifacts are called.** `apps/` today holds `console`
   (package name `"console"`) and `self-service` (Expo, scheduled for deletion). There is exactly
   one naming precedent (`console`), and the new name is referenced from three places that need to
   agree: the `pnpm-workspace.yaml` `apps/*` glob (any name works), the eventual Helm chart in
   `ai-helm/charts/` (the pattern [#287](https://github.com/ADORSYS-GIS/converse-frontends/issues/287)
   establishes for the console), and the ArgoCD `Application` entry in
   `ai-helm/charts/apps/values.yaml`.

   **This matters concretely**: `ai-helm/charts/lightbridge-code-intelligence/` already exists —
   it is LCI's **backend** service's chart. `ai-helm/charts/apps/values.yaml` already lists both
   `lightbridge-code-intelligence.yaml` (backend ArgoCD app) and `converse-ui.yaml` (console
   ArgoCD app) side by side. A new frontend chart or ArgoCD app named `lightbridge-code-intelligence`
   would collide with the existing backend entry.

2. **How the code graph gets built.** LCI's current code graph
   (`apps/web/components/repos/graph/`) is not a design-system concern — it is `@xyflow/react` +
   `dagre` layout logic, and it currently has an open, confirmed bug:
   [lightbridge-code-intelligence#635](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/issues/635).
   `layout.ts` feeds `dagre` a **fixed** `NODE_WIDTH = 200` / `NODE_HEIGHT = 44` for every node
   regardless of actual label length, so long Rust symbol paths (e.g. fully-qualified `impl`
   method names) overflow their node boxes, and dagre's spacing — computed from that same wrong
   assumption — can let an oversized card overlap an adjacent rank, making a correctly-resolved
   edge look like it terminates in empty space. Neither `packages/ui-web` nor `packages/chart-core`
   has any node-link graph primitive; `chart-core` is scales/bins/color-ramps for time-series and
   histogram charts only.

## Decision

### App identity

The new app is `apps/lci`, package name `"lci"` — lowercase, unscoped, matching the existing
`"console"` precedent exactly (not `"@lightbridge/lci"`; that scope is reserved for `packages/*`
per `@lightbridge/ui-web` and `@lightbridge/chart-core`).

Its Helm chart and ArgoCD app (built when the #287-style pipeline is copied for this app, in
[#331](https://github.com/ADORSYS-GIS/converse-frontends/issues/331)) are named `lci-web` —
distinct from the existing `lightbridge-code-intelligence` chart/app, which stays the name for
LCI's backend. `ai-helm/charts/apps/values.yaml` gains an `lci-web.yaml` entry alongside
`converse-ui.yaml` and the existing `lightbridge-code-intelligence.yaml`; it does not replace or
rename either.

### Code graph: port, then fix, inside this epic

The code graph is ported into `apps/lci` largely as-is (`@xyflow/react` + `dagre`, the same
`code-graph-canvas.tsx` / `layout.ts` / `node-inspector.tsx` / `use-code-graph.ts` shape), but
**#635's fix is absorbed into the port rather than carried forward as a known bug**: `layout.ts`
must size each dagre node from its actual rendered label (measured, not assumed at a fixed 200×44)
before this screen is considered done.

Rejected alternative — fixing #635 upstream in `lightbridge-code-intelligence` first, then porting
the corrected version — is not taken because it adds a cross-repo scheduling dependency this
epic's sprint does not control, for a fix that is small enough to do once during the port itself.

No graph-visualization library beyond what LCI already uses (`@xyflow/react` + `dagre`) is
introduced by this decision. If the design pass (`docs/design/lci-app/README.md`) surfaces a
second screen that also needs node-link visualization, that graph primitive extraction (its own
package, sibling to `chart-core`) is a separate, later decision — not assumed here.

## Consequences

- Good, because the chart/app naming collision with LCI's existing backend chart is avoided
  before anyone writes a Helm manifest, rather than discovered at deploy time.
- Good, because the code-graph screen ships without a known, user-visible rendering bug, instead
  of porting #635 forward into a second repo.
- Bad, because absorbing #635's fix into this epic's phase 3 (`apps/lci`'s implementation, #331)
  adds scope that wasn't in the epic's original 23pt estimate — the epic's own risk section
  already flagged this as the most likely reason it overruns, and this decision confirms rather
  than avoids that risk.
- Neutral, because if a second graph-visualization surface turns up during the design pass, the
  "extract a `graph-core` package" question is deferred to when there are two consumers, not one —
  consistent with how `chart-core` itself was only extracted once the console needed to share chart
  math with more than one screen.

## Alternatives considered

**App name `apps/code-intelligence`** — more descriptive, but breaks the short, single-word
pattern `console` set, and is a longer string to repeat across the chart name, the ArgoCD app
name, and CI job names. Rejected in favor of `apps/lci` — LCI is already how the epic, the issues,
and this document refer to the product.

**Reuse the `lightbridge-code-intelligence` chart name for the frontend, distinguish by
namespace instead** — technically possible in ArgoCD, but makes `ai-helm/charts/apps/values.yaml`
harder to read (two entries with the same base name, differing only in a namespace field a
reviewer has to open the file to see) and invites exactly the collision this ADR exists to avoid
if a namespace override is ever forgotten. Rejected.

**Fix #635 upstream first, port after** — see Decision above; rejected for the cross-repo
scheduling dependency it introduces against a sprint this epic does not control.

## References

- Epic: [converse-frontends#328](https://github.com/ADORSYS-GIS/converse-frontends/issues/328)
- [converse-frontends#287](https://github.com/ADORSYS-GIS/converse-frontends/issues/287) — Helm
  chart and image workflow pattern this app's deployment copies
- [lightbridge-code-intelligence#635](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/issues/635) —
  the code-graph layout bug this ADR's port decision absorbs
- [`docs/design/lci-app/README.md`](../design/lci-app/README.md),
  [`docs/design/lci-app/PRIMITIVES.md`](../design/lci-app/PRIMITIVES.md) — the design spec and gap
  list this ADR is a companion to
