import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// V21 -- the single highest-risk line in this app: `main.tsx`'s `<BrowserRouter
// basename={ROUTER_BASENAME}>`. Without a basename, `location.pathname` under authz-idp's `/ui`
// mount (e.g. `/ui/device`) matches none of `route-table.ts`'s prefix-free paths, and every route
// renders nothing -- while `tsc`, `vite build`, and every build-time verifier stay green, because
// none of them evaluate what actually renders at a URL. This suite imports `./main` for real
// (dynamically, so each test gets a fresh module evaluation) rather than re-implementing its
// `<BrowserRouter>` composition, so reverting the `basename` prop in `main.tsx` itself makes this
// file fail -- that is what "route tests actually guard the risk" (A-F9) means in practice.
//
// `virtual:pwa-register` is a Vite build-time virtual module with no file on disk;
// `vitest.config.ts` aliases it to a test stub so `main.tsx` can be imported at all here (see
// that config's own comment). `matchMedia` is stubbed because `applyThemePreference('system')`
// (main.tsx's very first statement) resolves the OS preference, and jsdom ships no `matchMedia`
// implementation.
function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

describe('main.tsx -- BrowserRouter basename', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    stubMatchMedia();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('resolves /ui/device to the device-entry route', async () => {
    window.history.pushState({}, '', '/ui/device');

    // main.tsx calls `createRoot(...).render(...)` directly (it is the app's real entry point,
    // not a `render()` call this suite controls), so its initial commit must be wrapped in `act`
    // itself -- Testing Library's automatic `act` wrapping only covers `render`/user-event calls.
    await act(async () => {
      await import('./main');
    });

    expect(await screen.findByLabelText(/device code/i)).not.toBeNull();
  });

  it('resolves the bare /ui/ basename to the placeholder route', async () => {
    window.history.pushState({}, '', '/ui/');

    // main.tsx calls `createRoot(...).render(...)` directly (it is the app's real entry point,
    // not a `render()` call this suite controls), so its initial commit must be wrapped in `act`
    // itself -- Testing Library's automatic `act` wrapping only covers `render`/user-event calls.
    await act(async () => {
      await import('./main');
    });

    expect(await screen.findByText(/placeholder/i)).not.toBeNull();
  });

  it('resolves /ui/error to the error route', async () => {
    window.history.pushState({}, '', '/ui/error');

    // main.tsx calls `createRoot(...).render(...)` directly (it is the app's real entry point,
    // not a `render()` call this suite controls), so its initial commit must be wrapped in `act`
    // itself -- Testing Library's automatic `act` wrapping only covers `render`/user-event calls.
    await act(async () => {
      await import('./main');
    });

    expect(await screen.findByText('Sign-in unavailable')).not.toBeNull();
  });
});
