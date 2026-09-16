#!/usr/bin/env node
// This app renders every real screen from the caller's own session data server-side, so the
// service worker's runtime-caching order is a correctness property, not a style preference:
// Serwist matches routes in registration order and the first match wins, so the `NetworkOnly`
// guard over `isUncacheablePath` has to be registered BEFORE `defaultCache`'s own same-origin
// catch-alls, or those catch-alls shadow it and every authenticated page gets cached anyway —
// silently, since a mis-ordered array still type-checks and still builds.
//
// Checked against the SOURCE (`src/sw.ts`), not the built worker: a minified bundle can't be
// matched against a specific call site or ordering with any real confidence (the built form
// renames locals, may inline or reorder, and a textual match against one variable name breaks on
// the next dependency bump) — the source is what a reviewer actually reads and reasons about, and
// it's what this check verifies stays true.
//
// Run as part of `pnpm --filter lci verify:sw` (wired into `build:web`; see package.json).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const swPath = resolve(process.cwd(), 'src/sw.ts');
let source;
try {
  source = readFileSync(swPath, 'utf8');
} catch (error) {
  console.error(`verify-service-worker-scope: could not read ${swPath}: ${error.message}`);
  process.exit(1);
}

const failures = [];

const networkOnlyIndex = source.indexOf('new NetworkOnly()');
const defaultCacheSpreadIndex = source.indexOf('...defaultCache');
const usesIsUncacheablePath = /matcher:\s*\([^)]*\)\s*=>[^,]*isUncacheablePath\(/.test(source);

if (networkOnlyIndex === -1) {
  failures.push('no `new NetworkOnly()` runtime-caching handler found');
}
if (defaultCacheSpreadIndex === -1) {
  failures.push('no `...defaultCache` spread found in `runtimeCaching`');
}
if (!usesIsUncacheablePath) {
  failures.push(
    'no runtime-caching matcher calls `isUncacheablePath(...)` — the `NetworkOnly` rule must be ' +
      'driven by the shared exclusion list, not a hand-rolled path check that can drift from it'
  );
}
if (
  networkOnlyIndex !== -1 &&
  defaultCacheSpreadIndex !== -1 &&
  networkOnlyIndex > defaultCacheSpreadIndex
) {
  failures.push(
    '`new NetworkOnly()` is registered AFTER `...defaultCache` — Serwist matches routes in ' +
      'registration order, so `defaultCache`\'s own same-origin catch-alls would shadow the ' +
      'exclusion rule and every authenticated page would be cached anyway'
  );
}

if (failures.length > 0) {
  console.error('verify-service-worker-scope: verification failed:\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  'verify-service-worker-scope: ok — `isUncacheablePath` drives a `NetworkOnly` rule registered ' +
    'ahead of `defaultCache` in src/sw.ts'
);
