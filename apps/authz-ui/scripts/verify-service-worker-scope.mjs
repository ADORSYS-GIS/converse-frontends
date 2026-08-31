#!/usr/bin/env node
// ADR-0021 Decision 10 (#442): the SW-level twin of
// `crates/lightbridge-authz-rest/tests/idp_server_tests.rs`'s
// `static_fallback_never_shadows_an_existing_protocol_route` -- but the real threat model here is
// narrower than "controls /oauth2/*". This page's service worker registers with the default scope
// derived from its own URL (`vite.config.ts`'s `base: '/ui/'` puts `sw.js` at `/ui/sw.js`, and
// `src/main.tsx`'s `registerSW({ immediate: true })` passes no explicit `scope`), so the browser
// caps its scope at `/ui/`. `crates/lightbridge-authz-rest/src/static_assets.rs` serves no
// `Service-Worker-Allowed` header, which is the only mechanism that could widen that cap -- so
// this service worker cannot ever intercept `/oauth2/*`, `/.well-known/*`, `/authorize`,
// `/healthz`, or the RPC surface, regardless of what its own code does. The live risk is entirely
// WITHIN `/ui/`: a SW that caches or otherwise intercepts `index.html` would serve a stale shell
// against Decision 10's `Cache-Control: no-cache` posture for that file, which is exactly the
// content-changes-without-a-new-URL case that policy exists to prevent.
//
// Run as part of `pnpm --filter authz-ui build:web` (see package.json) so a regression here fails
// CI's `build-web` job (`.github/workflows/test.yml`, which runs `pnpm build` -> `turbo run
// build:web`), not just a manual review.
//
// Two independent checks:
//   1. Precache manifest scope (built output): every entry vite-plugin-pwa injected into
//      `dist/sw.js` must be a content-hashed asset under `assets/`.
//   2. Source whitelist (source, not built output): `src/sw.ts` may contain exactly one import
//      (`precacheAndRoute` from `workbox-precaching`), whatever type-only declarations it needs,
//      and exactly one executable statement -- `precacheAndRoute(self.__WB_MANIFEST);` -- and
//      nothing else. This is what actually proves "no navigation interception, no runtime
//      caching, no other route": inspecting the built bundle for a specific workbox call site
//      (the previous approach) cannot distinguish "this code path is absent" from "this code path
//      exists but happens not to use that particular workbox helper" -- a hand-written
//      `self.addEventListener('fetch', ...)` navigation handler, for example, uses no workbox API
//      at all and would sail through a bundle-level check while still doing exactly the thing
//      Decision 10 forbids. Enumerating what IS allowed and rejecting everything else closes that
//      gap; a bundle-level check enumerating what is forbidden cannot.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distSwPath = resolve(process.cwd(), 'dist/sw.js');
let builtSource;
try {
  builtSource = readFileSync(distSwPath, 'utf8');
} catch (error) {
  console.error(`verify-service-worker-scope: could not read ${distSwPath}: ${error.message}`);
  process.exit(1);
}

const srcSwPath = resolve(process.cwd(), 'src/sw.ts');
let srcSource;
try {
  srcSource = readFileSync(srcSwPath, 'utf8');
} catch (error) {
  console.error(`verify-service-worker-scope: could not read ${srcSwPath}: ${error.message}`);
  process.exit(1);
}

const failures = [];

// 1. Precache scope: every entry in the injected manifest must be a content-hashed asset under
//    assets/. Matches workbox-build's injected manifest entry shape
//    (`{"revision":...,"url":"..."}`, key order not guaranteed) rather than depending on any
//    particular minified variable name for the `precacheAndRoute(...)` call site, which is not
//    stable across workbox versions.
const manifestEntryPattern =
  /"revision":(?:null|"[^"]*"),"url":"([^"]+)"|"url":"([^"]+)","revision":(?:null|"[^"]*")/g;
const precachedUrls = [];
for (const match of builtSource.matchAll(manifestEntryPattern)) {
  precachedUrls.push(match[1] ?? match[2]);
}

if (precachedUrls.length === 0) {
  failures.push('no precache manifest entries found -- expected the built assets bundle');
}

for (const url of precachedUrls) {
  if (!url.startsWith('assets/')) {
    failures.push(
      `precached url "${url}" is not under assets/ -- only content-hashed, ` +
        'immutably-cached assets may be precached (Decision 10)'
    );
  }
}

// 2. Source whitelist: strip comments from src/sw.ts, then walk the remaining top-level
//    statements with a small line-based state machine. Anything other than the one allowed
//    import, the `interface`/`declare` type-only blocks, and the one allowed
//    `precacheAndRoute(self.__WB_MANIFEST);` call is a failure that names the offending line.
const withoutBlockComments = srcSource.replace(/\/\*[\s\S]*?\*\//g, '');
const lines = withoutBlockComments
  .split('\n')
  .map((line) => line.replace(/\/\/.*$/, '').trim())
  .filter((line) => line.length > 0);

const ALLOWED_IMPORT =
  /^import\s*\{\s*precacheAndRoute\s*\}\s*from\s*['"]workbox-precaching['"]\s*;$/;
const ALLOWED_CALL = /^precacheAndRoute\(\s*self\.__WB_MANIFEST\s*\)\s*;$/;
const BLOCK_OPENER = /\{\s*$/;

let importCount = 0;
let callCount = 0;
let blockDepth = 0;
let blockStartLine = null;

for (const line of lines) {
  if (blockDepth > 0) {
    blockDepth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    if (blockDepth < 0) {
      failures.push(
        `src/sw.ts: unbalanced braces while closing the type-only block opened at "${blockStartLine}"`
      );
      blockDepth = 0;
    }
    continue;
  }

  if (ALLOWED_IMPORT.test(line)) {
    importCount += 1;
    continue;
  }
  if (/^import\b/.test(line)) {
    failures.push(
      `src/sw.ts: unexpected import "${line}" -- the only allowed import is ` +
        "{ precacheAndRoute } from 'workbox-precaching'"
    );
    continue;
  }

  if (ALLOWED_CALL.test(line)) {
    callCount += 1;
    continue;
  }

  if (/^(interface\s+\w+|declare\s+const\s+self\s*:)/.test(line) && BLOCK_OPENER.test(line)) {
    blockDepth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    blockStartLine = line;
    continue;
  }

  failures.push(
    `src/sw.ts: unexpected statement "${line}" -- this file may only contain the ` +
      'workbox-precaching import, type-only declarations, and precacheAndRoute(self.__WB_MANIFEST);'
  );
}

if (blockDepth > 0) {
  failures.push(`src/sw.ts: type-only block "${blockStartLine}" was never closed`);
}
if (importCount !== 1) {
  failures.push(
    `src/sw.ts: expected exactly one import of { precacheAndRoute } from 'workbox-precaching', found ${importCount}`
  );
}
if (callCount !== 1) {
  failures.push(
    `src/sw.ts: expected exactly one precacheAndRoute(self.__WB_MANIFEST); call, found ${callCount}`
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
  `verify-service-worker-scope: ok -- ${precachedUrls.length} precached asset(s) under assets/ ` +
    '(dist/sw.js); src/sw.ts matches the precache-only source whitelist (exactly one ' +
    'workbox-precaching import, exactly one precacheAndRoute(self.__WB_MANIFEST) call, nothing else)'
);
