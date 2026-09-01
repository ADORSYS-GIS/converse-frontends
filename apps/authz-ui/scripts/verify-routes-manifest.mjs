#!/usr/bin/env node
// Verifies `dist/routes.json`, the route allowlist `vite.config.ts`'s `authz-ui-routes-manifest`
// plugin emits from `src/routes/route-table.ts` (converse-frontends#409, lightbridge-authz#598).
// lightbridge-authz's `static_assets.rs` reads this manifest at startup and 404s every /ui path
// not listed in it — a malformed or drifted manifest is a live-traffic defect, not a cosmetic
// one, so every check below names its own failure rather than letting a generic parse error stand
// in for it.
//
// Modelled on scripts/verify-service-worker-scope.mjs: run as part of `pnpm --filter authz-ui
// build:web` (see package.json), after verify-css-csp.mjs, so a regression here fails CI's
// `build-web` job (`.github/workflows/test.yml`, which runs `pnpm build` -> `turbo run
// build:web`), not just a manual review.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const distDir = join(process.cwd(), 'dist');
const manifestPath = join(distDir, 'routes.json');
const indexPath = join(distDir, 'index.html');

const failures = [];

// 1. dist/routes.json exists and parses.
let raw;
try {
  raw = readFileSync(manifestPath, 'utf8');
} catch (error) {
  console.error(`verify-routes-manifest: could not read ${manifestPath}: ${error.message}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(raw);
} catch (error) {
  console.error(`verify-routes-manifest: ${manifestPath} is not valid JSON: ${error.message}`);
  process.exit(1);
}

// 2. version === 1.
if (manifest.version !== 1) {
  failures.push(`version must be exactly 1, got ${JSON.stringify(manifest.version)}`);
}

// 3. basename === '/ui' — the cross-check against Vite `base` and against Rust's
//    `nest_service("/ui", ..)`. A base change that forgot one of the three fails here.
if (manifest.basename !== '/ui') {
  failures.push(`basename must be exactly "/ui", got ${JSON.stringify(manifest.basename)}`);
}

// 4. routes is a non-empty array of strings.
const routes = manifest.routes;
if (!Array.isArray(routes) || routes.length === 0 || !routes.every((r) => typeof r === 'string')) {
  failures.push('routes must be a non-empty array of strings');
} else {
  // 5. '/' is present — the fail-closed floor Rust degrades to; if it's absent from a *valid*
  //    manifest the two sides disagree about the one path everyone assumes.
  if (!routes.includes('/')) {
    failures.push('routes must include "/" — the fail-closed floor lightbridge-authz degrades to');
  }

  // 6. Every route starts with '/', contains no ':' and no '*' (Rust matches exactly, and axum
  //    panics on some malformed route strings).
  for (const route of routes) {
    if (!route.startsWith('/')) {
      failures.push(`route "${route}" does not start with "/"`);
    }
    if (route.includes(':')) {
      failures.push(`route "${route}" contains ":" — parameterised routes are not allowlisted`);
    }
    if (route.includes('*')) {
      failures.push(`route "${route}" contains "*" — wildcard routes are not allowlisted`);
    }
  }

  // 7. No route starts with '/ui/' — catches the prefix-free/prefixed confusion in the one place
  //    it is cheap.
  for (const route of routes) {
    if (route.startsWith('/ui/') || route === '/ui') {
      failures.push(
        `route "${route}" is prefixed with "/ui" — routes.json is PREFIX-FREE ` +
          '(nest_service strips /ui before the request reaches the static service)'
      );
    }
  }

  // 8. No duplicates (axum panics on a duplicate route registration).
  const seen = new Set();
  for (const route of routes) {
    if (seen.has(route)) {
      failures.push(`route "${route}" is listed more than once`);
    }
    seen.add(route);
  }
}

// 9. dist/index.html exists (the file every allowlisted route resolves to).
let indexHtml;
try {
  indexHtml = readFileSync(indexPath, 'utf8');
} catch (error) {
  failures.push(`${indexPath} is missing: ${error.message}`);
}

// 10. A-F10 gap fix: nothing above cross-checks Vite's `base` against `basename` inside the
//     manifest itself — a `base` regression to '/' would leave `basename` unchanged (checks 1-9
//     all still pass) while every emitted asset URL loses its `/ui/` prefix. Read the built
//     index.html and assert it actually references `${basename}/assets/`.
if (indexHtml !== undefined && typeof manifest.basename === 'string') {
  const expected = `${manifest.basename}/assets/`;
  if (!indexHtml.includes(expected)) {
    failures.push(
      `${indexPath} does not reference "${expected}" — vite.config.ts's \`base\` has drifted ` +
        `from routes.json's basename ("${manifest.basename}"); the manifest can be internally ` +
        'valid while the bundle 404s fetching its own assets'
    );
  }
}

if (failures.length > 0) {
  console.error('verify-routes-manifest: verification failed:\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  `verify-routes-manifest: ok -- ${routes.length} route(s), basename "${manifest.basename}", ` +
    `${manifestPath} matches vite.config.ts's base and dist/index.html's asset prefix`
);
