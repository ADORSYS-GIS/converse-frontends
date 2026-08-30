// Post-`next build` step for `output: 'standalone'` (2026-08-30 usage-500 incident).
//
// `outputFileTracingIncludes` copies the pnpm STORE dirs (`node_modules/.pnpm/@cratestack+*`)
// into the standalone bundle, but never materializes the top-level scope links
// (`node_modules/@cratestack/<pkg>`) that Node's resolver actually walks — so the first
// server-side `import('@cratestack/cbor')` threw MODULE_NOT_FOUND in the container while every
// local gate (full node_modules present) stayed green. This script recreates exactly those links,
// glob-driven so a cratestack version bump changes nothing here.
import { mkdirSync, readdirSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const standaloneNm = join(here, '..', '.next', 'standalone', 'node_modules');
const store = join(standaloneNm, '.pnpm');
if (!existsSync(store)) {
  console.error('[link-standalone-cratestack] no standalone .pnpm store — did next build run?');
  process.exit(1);
}
let linked = 0;
for (const entry of readdirSync(store)) {
  if (!entry.startsWith('@cratestack+')) continue;
  const scoped = join(store, entry, 'node_modules', '@cratestack');
  if (!existsSync(scoped)) continue;
  for (const pkg of readdirSync(scoped)) {
    const target = join(scoped, pkg);
    const linkDir = join(standaloneNm, '@cratestack');
    const link = join(linkDir, pkg);
    mkdirSync(linkDir, { recursive: true });
    if (existsSync(link)) rmSync(link, { recursive: true, force: true });
    symlinkSync(relative(linkDir, target), link, 'dir');
    linked += 1;
  }
}
if (linked === 0) {
  console.error('[link-standalone-cratestack] traced store had no @cratestack packages — tracing regressed');
  process.exit(1);
}
console.log(`[link-standalone-cratestack] linked ${linked} package(s)`);
