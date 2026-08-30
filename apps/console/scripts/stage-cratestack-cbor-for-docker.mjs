// Pre-`docker build` / `buildah build` step (2026-08-31, Turbopack migration).
//
// `apps/console/Dockerfile` ships the usage scope guard's CBOR codec (2026-08-30 incident; see
// next.config.mjs's `serverExternalPackages` comment) by COPYing pnpm-store directories straight
// out of the build context, instead of relying on Next's standalone tracer — that tracer's
// `outputFileTracingIncludes` used to do this job but panics under Turbopack on this exact package
// family (again, see next.config.mjs).
//
// This script exists because a Dockerfile `COPY` cannot do that copy directly. Verified against
// real BuildKit behavior (Docker Desktop, since Buildah — what CI actually uses — isn't available
// on this machine to test against directly, but this relies on plain single-directory COPY
// semantics documented consistently across both, not a BuildKit-only extension):
//   - `COPY node_modules/.pnpm/@cratestack+cbor* ./node_modules/.pnpm/` (a glob matching multiple
//     directories) does NOT preserve each matched directory's own name — it merges the *contents*
//     of every match into the single destination, so two matches that each contain their own
//     `node_modules/` subdirectory collide: "cannot copy to non-directory: .../node_modules/.pnpm/
//     node_modules/@cratestack/cbor-node-darwin-arm64". True with and without a trailing slash on
//     either the source glob or the destination.
//   - A SINGLE literal directory source, `COPY somedir/ ./dest/`, does not have this problem — its
//     children keep their own names under `dest/`. So this script stages every needed pnpm-store
//     directory as a child of ONE staging directory first (using Node's own `fs.cpSync`), and the
//     Dockerfile does one plain `COPY` of that staging directory's contents.
//
// `fs.cpSync`'s two symlink options both matter and the wrong pick fails silently, not loudly:
// `dereference: false` (the default, kept) copies a symlink as a symlink rather than resolving it
// into a real copy of its target — required, since these store dirs are made of exactly that kind
// of cross-referencing symlink (see below). `verbatimSymlinks: true` (NOT the default — had to be
// set explicitly) keeps a relative symlink's target text exactly as recorded; without it, `cpSync`
// "helpfully" rewrites a relative symlink into an ABSOLUTE path pointing at the ORIGINAL location
// on the machine that ran this script — which happens to still resolve on that same machine
// (nothing looked broken locally) but is obviously not a path that exists inside the container.
//
// The seed set is every `@cratestack+cbor*` store dir, but that alone is NOT the full closure:
// `@cratestack+cbor@<version>/node_modules/@cratestack/ts-types` is itself a relative symlink to a
// SIBLING store dir, `@cratestack+ts-types@<version>` — a package whose name doesn't start with
// "cbor" and so isn't matched by the seed glob at all. Verified by inspecting every symlink the
// seed set actually contains, not assumed: `cbor` and `cbor-web` both depend on `ts-types` this
// way; skipping it would stage a dangling symlink, not an error Node necessarily throws (only if
// something actually `require()`s through it). Rather than hardcode "cbor* plus ts-types" — the
// same "duplicated fact in two places" trap that bit this package's version-bump handling before —
// this walks the real dependency graph: after staging a directory, its own `node_modules/@cratestack/*`
// symlinks are followed, and any sibling store dir they point at that isn't staged yet is queued.
// This is pnpm's own store layout, one relative-symlink hop at a time, until nothing new turns up.
import { cpSync, mkdirSync, readdirSync, readlinkSync, rmSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const store = join(repoRoot, 'node_modules', '.pnpm');
const stageDir = process.argv[2] ?? join(here, '..', '.docker-stage', 'cratestack-cbor');

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

/** The store-dir names (e.g. `@cratestack+ts-types@0.9.4`) a staged entry's own scope symlinks
 * point at, discovered by reading whatever `node_modules/@cratestack/*` symlinks it has. */
function siblingStoreDirs(entryDir) {
  const scoped = join(entryDir, 'node_modules', '@cratestack');
  const siblings = [];
  let names;
  try {
    names = readdirSync(scoped, { withFileTypes: true });
  } catch {
    return siblings;
  }
  for (const dirent of names) {
    if (!dirent.isSymbolicLink()) continue;
    const target = readlinkSync(join(scoped, dirent.name));
    // Relative targets look like `../../../@cratestack+ts-types@0.9.4/node_modules/@cratestack/ts-types`.
    const storeDirName = target.split('/').find((segment) => segment.startsWith('@cratestack+'));
    if (storeDirName) siblings.push(storeDirName);
  }
  return siblings;
}

const staged = new Set();
const queue = readdirSync(store).filter((entry) => entry.startsWith('@cratestack+cbor'));

while (queue.length > 0) {
  const entry = queue.shift();
  if (staged.has(entry)) continue;
  const source = join(store, entry);
  cpSync(source, join(stageDir, entry), { recursive: true, verbatimSymlinks: true });
  staged.add(entry);
  for (const sibling of siblingStoreDirs(source)) {
    if (!staged.has(sibling) && !queue.includes(sibling)) queue.push(sibling);
  }
}

if (staged.size === 0) {
  console.error(
    `[stage-cratestack-cbor-for-docker] no @cratestack+cbor* entries under ${store} — did pnpm install run?`
  );
  process.exit(1);
}
console.log(
  `[stage-cratestack-cbor-for-docker] staged ${staged.size} store dir(s) into ${stageDir}: ${[...staged].map((e) => basename(e)).join(', ')}`
);
