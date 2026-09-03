# The Storybook taxonomy

One Storybook, two story roots, nine sidebar folders. This file is the map and the rule set.

Storybook is the acceptance surface for every screen in this repo — the console's routes are all
Keycloak-gated, so a browser cannot reach them locally, while `packages/ui-web` renders the same
sections against fixtures with no auth at all. Verification workflow (running it, screenshotting,
the stale-dev-server trap) lives in `.claude/skills/console-story-verify/SKILL.md`; this file is
only about **where a story goes and what it is called**.

```sh
pnpm --filter @lightbridge/ui-web storybook        # dev, :6007
pnpm --filter @lightbridge/ui-web build-storybook  # static, what CI runs
node scripts/storybook-taxonomy.mjs --check        # the taxonomy guard
```

## Two roots, one sidebar

| Root                  | Holds                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| `packages/ui-web/src` | Every primitive, section, chart, dashboard part and console page story |
| `apps/lci/src`        | The LCI screens and their app-local components                         |

`apps/lci`'s screens are **app-local by [ADR 0014](../../docs/adr/0014-lci-app-scaffolding-and-code-graph.md)**
and `docs/design/lci-app/PRIMITIVES.md` — the code graph explicitly so, since neither `ui-web` nor
`chart-core` has anything to offer a node-link diagram. Nothing about wanting them in the sidebar
changes that, and moving them here would invert the dependency (`lci` depends on `ui-web`, never
the reverse). So `.storybook/main.ts` globs both trees and the stories stay beside their screens.

Three consequences of that, all in `.storybook/`:

- **`next/link` and `next/navigation` are aliased** to `.storybook/lci-stubs/`. `useRouter()`
  _throws_ without Next's App Router context — not something a decorator can paper over.
- **The `apps/lci` Server Action modules and `lib/server/session` are aliased too**
  (`lci-stubs/lci-server.ts`), because they transitively import `next/headers`, `openid-client`
  and `jose`, none of which can be bundled for a browser. A story shows that a control exists and
  is enabled/disabled correctly; what the action then does to the control plane is `apps/lci`'s own
  vitest suites' job.
- **Deep `@lightbridge/ui-web/src/…` imports are aliased at the source tree**, because this
  package's `exports` map answers them with a directory and Rollup — unlike Next and Vitest —
  will not do index resolution there.

Nothing in `packages/ui-web` imports any of the above, so none of those aliases can reach a
console story ([ADR 0017](../../docs/adr/0017-i18n-app-router-i18next.md): `ui-web` is
framework-agnostic and "Storybook renders it with no app around it").

## The folders

Reading order top-down: what a thing is made of, then what it is made into, then where it ships.
`.storybook/preview.tsx`'s `storySort` pins it; alphabetical would put `Charts` above `Dashboard`
above `Foundations`, which is noise.

| Folder                                                 | What belongs here                                                                                                        | Count |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----- |
| `Foundations/`                                         | Tokens and formatting primitives with no UI of their own — the money ladder                                              | 1     |
| `Primitives/Actions/`                                  | Clicked or typed into, no domain meaning: `Button`, `Checkbox`, `Toggle`, `SegmentedControl`, …                          | 7     |
| `Primitives/Fields/`                                   | Labelled inputs: `Field`, `SelectField`, `ScopeSelect`, `DateRangeField`                                                 | 4     |
| `Primitives/Overlays/`                                 | Renders over the page, plus the panels that are only ever a dialog's body                                                | 12    |
| `Primitives/Data/`                                     | Reads a value out, takes no input: `Card`, `LedgerTable`, `StatCard`, `Meter`, `StatusText`, …                           | 10    |
| `Primitives/States/`                                   | The empty / loading / error vocabulary, together so it reads as one set                                                  | 6     |
| `Charts/`                                              | Chart marks and chart furniture, `ShareBar` included                                                                     | 9     |
| `Shell/`                                               | Persistent chrome: `ConsoleShell`, `ConsoleSidebar`, `ConsoleTopBar`, `NavSpine`, `SubNav`, `PageHeader`, `PageControls` | 9     |
| `Dashboard/`                                           | The declarative engine (ADR 0015): `DashboardGrid`, `DashboardPanel`, `PanelRenderers`, `FromSpec`                       | 4     |
| `Sections/{Account,Usage,Budget,Admin,Auth,Settings}/` | Screen zones, filed by the product surface that mounts them                                                              | 39    |
| `Pages/{Account,Settings,Admin,Auth,LCI,Platform}/`    | Whole-screen compositions, one per route (11 of them LCI's)                                                              | 35    |
| `LCI/`                                                 | LCI's app-local components: the code graph, the Grafana embed, the review output, the repo tab strip                     | 6     |
| `Legacy/`                                              | Kept, browsable, and out of the way — see below                                                                          | 4     |

`Pages/Platform/` is the cross-cutting pair that is about the app rather than one screen:
`ShellPersistence` (rail width, tier behaviour) and `I18nGerman` (German strings are longer and
break tight layouts).

### `Legacy/`

`src/refine-mock/` — four refine-driven mock screens from the pre-Next console
([ADR 0009](../../docs/adr/0009-nextjs-console-replacement.md)). The dead-code audit
([#472](https://github.com/ADORSYS-GIS/converse-frontends/issues/472)) classifies the directory as
**class B**: referenced only by its own stories and tests, and the last consumer of
`@refinedev/core` in this package.

**The owner has not ruled on deleting it, so nothing here is deleted.** The four stories moved
under `Legacy/Refine/` so the live tree reads clean while that decision is open. When #472 is
answered, this folder either empties out or the notice comes off — it is not a permanent home.

## Adding a story

1. **Put the file beside its subject.** `src/components/<name>/component.stories.tsx`,
   `src/sections/<name>/component.stories.tsx`, `src/pages-stories/<screen>.stories.tsx`, or —
   for LCI — `apps/lci/src/containers/<screen>.stories.tsx`.
2. **Title it under an existing folder.** `title: 'Primitives/Data/Thing'`. If none of the nine
   roots fits, that is a design conversation, not a new root: adding one means editing
   `TAXONOMY_ROOTS` in `scripts/storybook-taxonomy.mjs` **and** the `storySort` order in
   `.storybook/preview.tsx`, and `src/story-taxonomy.test.ts` asserts the two agree.
3. **Cover the states, not just the happy path** — empty, loading, error, and both themes
   (`globals: { theme: 'wireframe' }`). A hardcoded colour shows up in exactly one theme.
4. **Run the guard**: `node scripts/storybook-taxonomy.mjs --check`, or just
   `pnpm --filter @lightbridge/ui-web test`, which asserts the same thing.

### Why the guard exists

Two failures nothing else catches:

- **A duplicate title silently eats a story.** Storybook merges two metas with the same `title`
  into one sidebar entry — no warning, no build failure. `build-storybook` stays green while a
  page story stops being reachable.
- **A new story quietly re-opens a flat root.** `title: 'Components/Foo'` compiles perfectly and
  puts the sidebar back where it was before this reorganisation.

The codemod that performed the 2026-09-03 rename lives in the same file
(`node scripts/storybook-taxonomy.mjs --apply`). Its `RENAMES` map is kept after the fact as
documentation of where every story moved.

## Story ids

Ids are derived from the title, so a rename changes them. The ones cited elsewhere in the repo:

| Story                       | Id prefix                     | Cited by                                                       |
| --------------------------- | ----------------------------- | -------------------------------------------------------------- |
| `Dashboard/FromSpec`        | `dashboard-fromspec--`        | `console-story-verify`, `dashboard-panel`, `console-ui` skills |
| `Pages/Admin/Overview`      | `pages-admin-overview--`      | ADR 0013 §"Operator dashboard"                                 |
| `Pages/Platform/I18nGerman` | `pages-platform-i18ngerman--` | `console-story-verify`, `i18n-copy` skill                      |

`packages/ui-web/storybook-static/index.json` is the source of truth — grep it rather than
guessing.
