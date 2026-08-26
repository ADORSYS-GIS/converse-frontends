#!/usr/bin/env node
/**
 * Post-export step: copy `@cratestack/cbor-web`'s `.wasm` binary next to the exported web bundle.
 *
 * ## Why this exists
 *
 * `@lightbridge/authz-rpc`'s single codec (`packages/authz-rpc/src/codec.ts`) is `@cratestack/cbor`
 * -- WASM on the web (`@cratestack/cbor-web`, wasm-bindgen `--target web`). Its generated init code
 * resolves the `.wasm` binary with `new URL('cratestack_cbor_wasm_bg.wasm', import.meta.url)`, then
 * `fetch()`s it. Metro (Expo's bundler) has no build-time understanding of that pattern -- unlike
 * webpack/Turbopack, it does not statically analyze a `new URL(asset, import.meta.url)` call and
 * copy the referenced file into the output; it only bundles what's reached through `import`/
 * `require`, and the `.wasm` binary is reached through neither. `expo export --platform web`
 * consequently reports success while silently omitting the `.wasm` file from `dist/` entirely --
 * confirmed directly: a fresh `expo export` output has zero `.wasm` files anywhere under `dist/`.
 *
 * Expo's own `import.meta.url` polyfill (`ImportMetaRegistry.url` in the exported bundle, backed by
 * `document.currentScript.src`) resolves to the URL of the single bundled entry script the whole
 * app ships as. `new URL('cratestack_cbor_wasm_bg.wasm', <that script's URL>)` therefore resolves
 * to a filename placed in the SAME DIRECTORY as the entry script -- `_expo/static/js/web/` as of
 * this Expo Router version -- regardless of the entry script's own content hash. Verified directly:
 * a copy of the `.wasm` file placed there, served with a plain static file server, is actually
 * fetched (200, correct `application/wasm` content-type) at exactly that resolved URL, and
 * `createCborCodec()` resolves with no error -- see this PR's own verification notes.
 *
 * ## Why a script rather than a Metro resolver/asset-extension change
 *
 * Metro's asset pipeline (`resolver.assetExts`, the pattern `apps/self-service/metro.config.js`
 * already uses for other codegen-output quirks) only intercepts static `require()`/`import`
 * specifiers it can see at bundle time -- it cannot intercept a *runtime* `new URL(..., import.meta
 * .url)` + `fetch()` call, which is exactly what wasm-bindgen's `--target web` output does, and
 * `@cratestack/cbor-web` does not expose a way to override it (`createCborCodec()` takes no init
 * argument). A physical post-export file copy is the correct fix for this shape of problem, not a
 * bundler config change -- there's nothing for the bundler to configure here.
 *
 * ## Why resolution goes through the pnpm store directly, not `require.resolve`/`import.meta.resolve`
 *
 * `@cratestack/cbor-web`'s `package.json` is `"type": "module"` with an `exports` map that declares
 * only `"import"` conditions, no `"require"` -- the exact same shape that breaks Jest's (CJS-first)
 * resolver for this whole dependency family (see `packages/hooks/src/wire-safety.ts`'s doc comment).
 * That rules out plain CJS `require.resolve` (confirmed directly: `ERR_PACKAGE_PATH_NOT_EXPORTED`/
 * "No exports main defined" reaching for `@cratestack/cbor` through `@lightbridge/authz-rpc`'s own
 * `node_modules`, even from this file despite it being ESM). `import.meta.resolve()`'s stable,
 * single-argument form resolves only relative to its OWN file's location, and this app never
 * declares `@cratestack/cbor`/`@cratestack/cbor-web` as a direct dependency (they're transitive,
 * through `@lightbridge/authz-rpc`), so neither approach reaches the package from here. Scanning
 * the workspace's `node_modules/.pnpm` store for the versioned directory pnpm always creates there
 * sidesteps both: it's plain `fs`, not module resolution, so no `exports` map or CJS/ESM condition
 * applies.
 *
 * ## Why this should not exist forever
 *
 * The right fix is upstream, in `@cratestack/cbor-web`: an official Metro/Expo asset-copy story
 * (e.g. an `expo-module`-style config plugin, or accepting an explicit `wasmUrl` override so a
 * caller can route through Metro's own asset system instead of a raw runtime `fetch`). Delete this
 * script and the `&& node scripts/...` step in `package.json` once that lands.
 *
 * ## Contract
 *
 * Locates every `.js` file actually emitted under `dist/_expo/static/js/web/` (there is normally
 * exactly one, the entry bundle; matching by directory rather than a hardcoded/hashed filename
 * keeps this robust to Expo Router changing its hashing scheme) and copies the `.wasm` binary
 * alongside each one. Fails loudly (non-zero exit, no partial output) if the export output or the
 * wasm source file is missing, so a broken copy never silently ships.
 */
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(here, '..', '..', '..');
const appRoot = join(here, '..');
const distWebDir = join(appRoot, 'dist', '_expo', 'static', 'js', 'web');
const WASM_FILE_NAME = 'cratestack_cbor_wasm_bg.wasm';

if (!existsSync(distWebDir)) {
  console.error(
    `copy-cbor-wasm-asset: ${distWebDir} does not exist -- run "expo export --platform web" first.`
  );
  process.exit(1);
}

const pnpmStoreDir = join(workspaceRoot, 'node_modules', '.pnpm');
const cborWebStoreDirName = existsSync(pnpmStoreDir)
  ? readdirSync(pnpmStoreDir).find((name) => name.startsWith('@cratestack+cbor-web@'))
  : undefined;
if (!cborWebStoreDirName) {
  console.error(
    `copy-cbor-wasm-asset: no "@cratestack+cbor-web@*" directory found under ${pnpmStoreDir} -- ` +
      'is @cratestack/cbor still a dependency of packages/authz-rpc, and has `pnpm install` run?'
  );
  process.exit(1);
}
const wasmSourcePath = join(
  pnpmStoreDir,
  cborWebStoreDirName,
  'node_modules',
  '@cratestack',
  'cbor-web',
  'dist',
  'wasm-pkg',
  WASM_FILE_NAME
);
if (!existsSync(wasmSourcePath)) {
  console.error(`copy-cbor-wasm-asset: resolved but missing source file ${wasmSourcePath}.`);
  process.exit(1);
}

const entryFiles = readdirSync(distWebDir).filter((name) => name.endsWith('.js'));
if (entryFiles.length === 0) {
  console.error(`copy-cbor-wasm-asset: no .js entry bundle found under ${distWebDir}.`);
  process.exit(1);
}

const destPath = join(distWebDir, WASM_FILE_NAME);
copyFileSync(wasmSourcePath, destPath);
console.log(
  `copy-cbor-wasm-asset: copied ${wasmSourcePath} -> ${destPath} (alongside ${entryFiles.join(', ')})`
);
