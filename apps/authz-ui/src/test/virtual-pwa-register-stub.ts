// Test-only stand-in for vite-plugin-pwa's `virtual:pwa-register` module. `vitest.config.ts`
// aliases the real virtual specifier to this file, because vitest's project here runs no
// `VitePWA` plugin (that plugin's virtual-module resolution is a Vite build-time concern, not a
// unit-test one), and `src/main.tsx` needs SOME implementation to import in order for
// `src/main.test.tsx` to prove `<BrowserRouter basename>` actually resolves routes.
export function registerSW(_options?: unknown): () => void {
  return () => {};
}
