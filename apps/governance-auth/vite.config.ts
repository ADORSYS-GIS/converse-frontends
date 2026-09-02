import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Relative, not `@lightbridge/ui-web/src/lib/theme`: Vite loads this config through esbuild with
// plain Node resolution, where `resolve.alias` below does not apply, and `ui-web`'s `exports`
// wildcard gives no extension fallback (see the alias comment).
import { CONSOLE_THEME_NO_FLASH_SCRIPT } from '../../packages/ui-web/src/lib/theme';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromHere = createRequire(import.meta.url);

/**
 * The four `@fontsource` entrypoints `packages/ui-web/src/styles.css` imports, redirected to their
 * Latin-subset twins. Consumed by `resolve.alias` below, which carries the reasoning.
 *
 * `requireFromHere.resolve` is load-bearing, and cost a build to find: with a BARE replacement
 * (`'@fontsource/inter/latin-400.css'`) Vite's alias plugin warns "rewrote … but was not handled by
 * other plugins" and the emitted CSS is byte-identical to the unaliased build — `@tailwindcss/vite`
 * resolves the `@import`s in `styles.css` with its own resolver, which never sees a Vite alias.
 * An ABSOLUTE replacement is a path both resolvers agree on. Measured, not assumed: 22 faces /
 * 656 KiB before, 4 faces / 181 KiB after.
 */
const latinSubsetAliases = [
  ['@fontsource/inter/400.css', '@fontsource/inter/latin-400.css'],
  ['@fontsource/ibm-plex-mono/400.css', '@fontsource/ibm-plex-mono/latin-400.css'],
  ['@fontsource/ibm-plex-mono/500.css', '@fontsource/ibm-plex-mono/latin-500.css'],
  ['@fontsource/ibm-plex-mono/600.css', '@fontsource/ibm-plex-mono/latin-600.css'],
].map(([find, subset]) => ({ find, replacement: requireFromHere.resolve(subset) }));

/**
 * Inlines the console's own pre-hydration theme resolver into `<head>` (ADR 0010 Decision 5), so
 * a machine in light mode never flashes the `black` floor that `index.html` ships statically.
 *
 * `apps/console` inlines this same constant; `apps/authz-ui` deliberately cannot, because
 * `authz-idp` serves it under `default-src 'self'` with no `'unsafe-inline'`. THIS app is at the
 * other extreme: nothing serves it at all — a loopback listener writes the bytes to a socket —
 * so there is no CSP to satisfy and no `<script src>` that could survive anyway.
 *
 * Injected from the shared constant rather than pasted into `index.html`, so the resolution order
 * stays defined in exactly one place across all three web surfaces.
 */
function themeNoFlashScript(): Plugin {
  return {
    name: 'governance-auth-theme-no-flash',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: CONSOLE_THEME_NO_FLASH_SCRIPT,
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig({
  // Everything is inlined, so no asset URL should survive the build at all. `'./'` is the
  // belt-and-braces setting: were one ever to survive, it would be relative rather than an
  // absolute `/assets/...` that a loopback listener serving exactly one path would 404.
  base: './',
  resolve: {
    // The build-time twin of `tsconfig.json`'s and `vitest.config.ts`'s identical mapping, for
    // the reason `apps/authz-ui/vite.config.ts` documents: `ui-web`'s `package.json` advertises
    // `"./src/*": "./src/*"`, and once a package declares `exports` at all, Vite's resolver stops
    // applying extension/index fallback to a wildcarded subpath target — so
    // `.../src/sections/auth-panel-shell` never finds that directory's `index.ts` without this.
    alias: [
      {
        find: /^@lightbridge\/ui-web\/src\/(.*)$/,
        replacement: path.resolve(currentDir, '../../packages/ui-web/src/$1'),
      },
      // LATIN SUBSETS ONLY, for the four faces `packages/ui-web/src/styles.css` imports.
      //
      // This is not a second font pipeline: the families, the weights and the files are the
      // console's own, imported through the same `styles.css`. It narrows the WRITING SYSTEMS,
      // because this app has one property no other app in this repo has — every byte it emits is
      // `include_str!`d into a shipped binary. `@fontsource`'s default `400.css` fans out to
      // eleven `@font-face` rules per weight (cyrillic, greek, vietnamese, latin-ext, …); at four
      // faces that was 44 rules and 656 KiB of base64 in the artifact, for a page whose entire
      // copy is four fixed English sentences that live in `src/callback-copy.ts`.
      //
      // `scripts/verify-single-file.mjs` fails the build if a non-Latin `unicode-range` or more
      // than 200 KiB of font data comes back, so this cannot silently stop applying.
      ...latinSubsetAliases,
    ],
  },
  plugins: [react(), tailwindcss(), themeNoFlashScript(), viteSingleFile()],
  build: {
    // THE constraint this app exists to satisfy. `governance-auth`'s loopback listener
    // `include_str!`s the built page at COMPILE time and writes it to a socket on 127.0.0.1: there
    // is no origin to fetch a second file from, no CDN, and possibly no network at all. One file,
    // or the page is broken in exactly the situation it is for.
    //
    // `viteSingleFile()` inlines the JS and the CSS. This limit is what inlines everything the
    // CSS itself references — every `@fontsource` `.woff2` becomes a `data:` URI rather than an
    // emitted `assets/*.woff2`. Stated here rather than left to the plugin's own default because
    // it is the half of the contract that is easy to break by accident.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    // There is nothing to preload — one inlined chunk, no `<link rel="modulepreload">` for the
    // polyfill to find. Off, so the bundle does not open with dead code whose whole job is to
    // create `<link>` elements on a page that must never fetch anything.
    modulePreload: false,
    // A single inlined bundle has no compressed size worth reporting, and gzip-ing ~1MB on every
    // build to print a number nobody acts on is the slowest step in this build.
    reportCompressedSize: false,
    // `browserslist` in package.json is the human-readable statement of the same floor; this is
    // what Vite actually enforces. `es2022` covers every browser in it.
    target: 'es2022',
  },
});
