import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { ROUTE_PATHS, ROUTER_BASENAME } from './src/routes/route-table';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // ADR-0021 Decision 10 (lightbridge-authz #442), narrowed by the follow-up that mounts this
  // build under `/ui` instead of at the idp router root: `authz-idp` serves `GET /` as its own
  // API-welcome-JSON route and this SPA exclusively under `/ui`, never at the root. Every emitted
  // asset reference, the service worker's own registration URL, and its resulting scope must all
  // carry that same `/ui/` prefix or the built page would 404 fetching its own bundle once served
  // by `authz-idp`.
  base: '/ui/',
  resolve: {
    // The build-time twin of `tsconfig.json`'s `@lightbridge/ui-web/src/*` path mapping and of
    // `vitest.config.ts`'s identical alias. `ui-web`'s `package.json` advertises `"./src/*":
    // "./src/*"`, but once a package declares `exports` at all, Vite's resolver does NOT apply
    // extension/index fallback to a wildcarded subpath target — so `.../src/lib/theme` never
    // finds `theme.ts` without this. (`apps/console/vitest.config.ts` documents the same
    // resolver behaviour, found the hard way.)
    alias: [
      {
        find: /^@lightbridge\/ui-web\/src\/(.*)$/,
        replacement: path.resolve(currentDir, '../../packages/ui-web/src/$1'),
      },
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Hand-written sw.ts (src/sw.ts) instead of the default generateSW strategy: see that
      // file's own doc comment for why -- generateSW's `navigateFallback` mechanism is
      // fundamentally cache-first for whatever URL it targets, which conflicts with Decision 10's
      // `no-cache` posture for index.html.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // MONOREPO ADDITION. `src/main.tsx` calls `registerSW()` from `virtual:pwa-register`
      // itself, so the plugin has no registration code to inject -- stating that explicitly
      // rather than relying on `'auto'` inferring it. This is load-bearing for the CSP:
      // `static_assets.rs` serves every `/ui` response with `default-src 'self';
      // frame-ancestors 'none'` -- no `'unsafe-inline'`, no nonce, no hash -- so ANY inline
      // <script> the build injected into index.html would be blocked at runtime.
      injectRegister: null,
      injectManifest: {
        // Precache ONLY the content-hashed, immutably-cached bundle -- never index.html or any
        // other unhashed file. A hash change is a different URL, so this list can never go stale
        // the way caching index.html itself would.
        globPatterns: ['assets/**/*.{js,css}'],
      },
      // No web app manifest: this surface has no decided visual identity yet (icons, name, theme
      // colour are design decisions story #409 owns), and installability was never part of the
      // ask (the PWA plugin is here for asset caching only).
      manifest: false,
      devOptions: {
        // Never register a SW against the dev server -- only ever verify against a real
        // production build, the same caution Decision 10's Risk table calls out for the CSP.
        enabled: false,
      },
    }),
    // Emits the route allowlist authz-idp reads at startup (lightbridge-authz#598, ADR-0029's
    // artifact contract). GENERATED from route-table.ts, never hand-listed: a hand-listed
    // manifest is a second source of truth, and its drift mode is "the route works in vite dev
    // and 404s in production" — the exact risk #598's own Risks section names.
    // dist/routes.json is inside turbo's `build:web` outputs (`dist/**`), so it is cache-covered.
    // Last in `plugins`, after VitePWA(...), so it cannot race the SW emit.
    {
      name: 'authz-ui-routes-manifest',
      apply: 'build',
      closeBundle() {
        writeFileSync(
          path.resolve(currentDir, 'dist/routes.json'),
          `${JSON.stringify({ version: 1, basename: ROUTER_BASENAME, routes: [...ROUTE_PATHS] }, null, 2)}\n`
        );
      },
    },
  ],
});
