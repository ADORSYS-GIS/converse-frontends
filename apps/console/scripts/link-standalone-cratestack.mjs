// Post-`next build` step for `output: 'standalone'` (2026-08-30 usage-500 incident).
//
// The traced/copied store dirs (`node_modules/.pnpm/@cratestack+*`) never materialize the
// top-level scope links (`node_modules/@cratestack/<pkg>`) that Node's resolver actually walks —
// so the first server-side `import('@cratestack/cbor')` threw MODULE_NOT_FOUND in the container
// while every local gate (full node_modules present) stayed green. This script recreates exactly
// those links, glob-driven so a cratestack version bump changes nothing here.
//
// Two callers, as of the move to Docker-side CBOR shipping (next.config.mjs no longer has an
// `outputFileTracingIncludes` block — Turbopack panics on it, see that file's comment):
//   1. `apps/console/Dockerfile`, at image-build time, against the image's own root layout
//      (`/app/node_modules`, not `/app/apps/console/.next/standalone/node_modules` — the
//      standalone COPY already flattens the bundle root onto `/app`). Passed explicitly:
//      `node link-standalone-cratestack.mjs /app/node_modules`.
//   2. Anyone reproducing the image's steps locally against a `.next/standalone` produced by
//      `next build` — the default (no CLI arg) still resolves relative to this script's own
//      location, unchanged from before this file gained an explicit-root mode.
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
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const explicitRoot = process.argv[2];
const standaloneNm = explicitRoot
  ? resolve(explicitRoot)
  : join(here, '..', '.next', 'standalone', 'node_modules');
const store = join(standaloneNm, '.pnpm');
if (!existsSync(store)) {
  console.error(
    `[link-standalone-cratestack] no .pnpm store under ${standaloneNm} — did next build (or the image COPY) run?`
  );
  process.exit(1);
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

// pkg name -> { version, target }
const candidates = new Map();
for (const entry of readdirSync(store)) {
  if (!entry.startsWith('@cratestack+')) continue;
  const entryVersion = entry.match(/@([^@]+)$/)?.[1];
  const scoped = join(store, entry, 'node_modules', '@cratestack');
  if (!entryVersion || !existsSync(scoped)) continue;
  for (const pkg of readdirSync(scoped)) {
    const target = join(scoped, pkg);
    const existing = candidates.get(pkg);
    if (!existing || compareVersions(entryVersion, existing.version) > 0) {
      candidates.set(pkg, { version: entryVersion, target });
    }
  }
}

let linked = 0;
const linkDir = join(standaloneNm, '@cratestack');
for (const [pkg, { target }] of candidates) {
  const link = join(linkDir, pkg);
  mkdirSync(linkDir, { recursive: true });
  if (existsSync(link)) rmSync(link, { recursive: true, force: true });
  symlinkSync(relative(linkDir, target), link, 'dir');
  linked += 1;
}
if (linked === 0) {
  console.error(
    `[link-standalone-cratestack] store under ${standaloneNm} had no @cratestack packages — shipping regressed`
  );
  process.exit(1);
}
console.log(`[link-standalone-cratestack] linked ${linked} package(s) under ${standaloneNm}`);
