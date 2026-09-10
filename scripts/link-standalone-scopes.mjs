// Post-`next build` step for `output: 'standalone'`: recreate the top-level scope symlinks
// (`node_modules/@scope/<pkg>`) that Node's resolver actually walks.
//
// ## The bug this exists for
//
// Next's standalone tracer copies the pnpm STORE directories it traced
// (`node_modules/.pnpm/@scope+pkg@x.y.z/…`) but does NOT materialize the scope links that point at
// them — it special-cases only `next` itself. Every other externalized package therefore resolves
// fine on a developer machine (where the real workspace `node_modules` is one directory up and
// silently answers the lookup) and MODULE_NOT_FOUND inside the container, where `/app` is the
// whole world. Verified by copying `.next/standalone/` out of the workspace and running
// `require.resolve` in it: `next` resolves, everything else does not.
//
// Discovered twice, the hard way:
//   1. 2026-08-30 (usage-500 incident) — the first server-side `import('@cratestack/cbor')` threw
//      MODULE_NOT_FOUND in prod while every local gate stayed green. This script's first version
//      fixed exactly that, for exactly that scope.
//   2. 2026-09-03 (OpenTelemetry, converse-frontends#443) — same failure shape, different scope.
//      Which is why the script is now scope-PARAMETERIZED and lives at the repo root: `apps/lci`
//      needs it too, and a third copy of this logic was not the answer.
//
// ## Usage
//
//   node scripts/link-standalone-scopes.mjs --root <node_modules dir> --scope @a [--scope @b]
//
// Both flags are required and `--scope` repeats. Every named scope must yield at least one link;
// a scope that matches nothing is a FAILURE (exit 1), not a warning — silently linking nothing is
// how this class of bug reaches production in the first place.
//
// Two kinds of caller:
//   1. An app's own `build:web`, against the bundle `next build` just produced
//      (`apps/<app>/.next/standalone/node_modules`). The links it writes are RELATIVE and stay
//      inside the bundle, so the Dockerfile's wholesale `COPY .next/standalone/ ./` carries them
//      into the image intact — nothing extra is needed at image-build time.
//   2. `apps/console/Dockerfile`, at image-build time, against the image's own root layout
//      (`/app/node_modules` — the standalone COPY already flattens the bundle root onto `/app`).
//      That call exists because the `@cratestack/*` store dirs are COPYed in by the Dockerfile
//      AFTER the standalone bundle, so no build-time run could have seen them (Next's tracer
//      panics on them under Turbopack — see apps/console/next.config.mjs).
//
// The traced/copied store can contain more than one version of the same package name at once —
// verified while bumping cratestack 0.8.13 -> 0.9.4: the standalone `.pnpm` dir carried both
// `@cratestack+cbor-web@0.8.13` and `@cratestack+cbor-web@0.9.4` side by side (the workspace store
// hadn't pruned the old version yet). Linking whichever one a plain `readdirSync` scan happens to
// visit last would make the final link version-order-dependent — not wrong today only because
// directory order happened to put the newer version last. Instead, each candidate's version is
// parsed from its containing store dirname and only replaces an existing link for the same package
// name if it is actually newer, so the newest resolved version always wins regardless of scan
// order.
import { mkdirSync, readdirSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

function parseArgs(argv) {
  let root;
  const scopes = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') root = argv[++i];
    else if (argv[i] === '--scope') scopes.push(argv[++i]);
    else {
      console.error(`[link-standalone-scopes] unknown argument: ${argv[i]}`);
      process.exit(1);
    }
  }
  if (!root || scopes.length === 0 || scopes.some((s) => !s?.startsWith('@'))) {
    console.error(
      '[link-standalone-scopes] usage: --root <node_modules dir> --scope @a [--scope @b]'
    );
    process.exit(1);
  }
  return { root: resolve(root), scopes };
}

/** Compares two `x.y.z` version strings. Returns >0 if `a` is newer than `b`. */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const { root: standaloneNm, scopes } = parseArgs(process.argv.slice(2));
const store = join(standaloneNm, '.pnpm');
if (!existsSync(store)) {
  console.error(
    `[link-standalone-scopes] no .pnpm store under ${standaloneNm} — did next build (or the image COPY) run?`
  );
  process.exit(1);
}
const storeEntries = readdirSync(store);

let failed = false;
for (const scope of scopes) {
  // pkg name -> { version, target }
  const candidates = new Map();
  // pnpm mangles `@scope/pkg` to `@scope+pkg@<version>` in store dirnames. A store dir for one
  // package can also CONTAIN siblings from the same scope (its own dependencies), which is why the
  // inner scope directory is enumerated rather than assumed to hold exactly the outer package.
  const prefix = `${scope}+`;
  for (const entry of storeEntries) {
    if (!entry.startsWith(prefix)) continue;
    // pnpm appends a `_<hash>` peer-suffix to dirnames like
    // `@opentelemetry+resources@2.11.0_@opentelemetry+api@1.9.1`; the version is the segment
    // after the LAST `@` of the package part, so match it before any peer suffix.
    const entryVersion = entry.match(/@(\d[^_]*)/)?.[1];
    const scoped = join(store, entry, 'node_modules', scope);
    if (!entryVersion || !existsSync(scoped)) continue;
    for (const pkg of readdirSync(scoped)) {
      const target = join(scoped, pkg);
      const existing = candidates.get(pkg);
      if (!existing || compareVersions(entryVersion, existing.version) > 0) {
        candidates.set(pkg, { version: entryVersion, target });
      }
    }
  }

  const linkDir = join(standaloneNm, scope);
  let linked = 0;
  for (const [pkg, { target }] of candidates) {
    const link = join(linkDir, pkg);
    mkdirSync(linkDir, { recursive: true });
    if (existsSync(link)) rmSync(link, { recursive: true, force: true });
    symlinkSync(relative(linkDir, target), link, 'dir');
    linked += 1;
  }

  if (linked === 0) {
    console.error(
      `[link-standalone-scopes] store under ${standaloneNm} had no ${scope} packages — shipping regressed`
    );
    failed = true;
    continue;
  }
  console.log(
    `[link-standalone-scopes] linked ${linked} ${scope} package(s) under ${standaloneNm}`
  );
}

if (failed) process.exit(1);
