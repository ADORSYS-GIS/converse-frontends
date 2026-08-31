import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyThemePreference,
  CONSOLE_THEME_NO_FLASH_SCRIPT,
  CONSOLE_THEME_STORAGE_KEY,
  readStoredThemePreference,
  resolveConsoleTheme,
} from './theme';

/** jsdom ships no `matchMedia`; `systemTheme()` would throw without this. */
function stubPrefersLight(prefersLight: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: prefersLight,
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

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveConsoleTheme', () => {
  it('returns an explicit preference unchanged, without consulting the OS', () => {
    stubPrefersLight(true);
    expect(resolveConsoleTheme('black')).toBe('black');
    expect(resolveConsoleTheme('wireframe')).toBe('wireframe');
  });

  it("falls back to prefers-color-scheme for 'system'", () => {
    stubPrefersLight(true);
    expect(resolveConsoleTheme('system')).toBe('wireframe');

    stubPrefersLight(false);
    expect(resolveConsoleTheme('system')).toBe('black');
  });
});

describe('readStoredThemePreference', () => {
  it('returns null when nothing is stored', () => {
    expect(readStoredThemePreference()).toBeNull();
  });

  it('returns the stored theme when it is one we recognise', () => {
    window.localStorage.setItem(CONSOLE_THEME_STORAGE_KEY, 'wireframe');
    expect(readStoredThemePreference()).toBe('wireframe');
  });

  it('treats an unrecognised stored value as unset rather than trusting it', () => {
    window.localStorage.setItem(CONSOLE_THEME_STORAGE_KEY, 'solarized');
    expect(readStoredThemePreference()).toBeNull();
  });

  it('returns null when localStorage.getItem throws (private mode, quota, disabled)', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(readStoredThemePreference()).toBeNull();

    getItem.mockRestore();
  });
});

describe('applyThemePreference', () => {
  it('persists an explicit choice and writes data-theme on <html>', () => {
    stubPrefersLight(false);
    applyThemePreference('wireframe');

    expect(window.localStorage.getItem(CONSOLE_THEME_STORAGE_KEY)).toBe('wireframe');
    expect(document.documentElement.dataset.theme).toBe('wireframe');
  });

  it("clears the stored key for 'system' and applies the resolved theme", () => {
    window.localStorage.setItem(CONSOLE_THEME_STORAGE_KEY, 'wireframe');
    stubPrefersLight(false);

    applyThemePreference('system');

    expect(window.localStorage.getItem(CONSOLE_THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('black');
  });

  it('still applies the attribute when storage throws (private mode, quota)', () => {
    stubPrefersLight(false);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => applyThemePreference('wireframe')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('wireframe');

    setItem.mockRestore();
  });
});

describe('CONSOLE_THEME_NO_FLASH_SCRIPT', () => {
  /**
   * Executes the actual script source the way `apps/console`'s root layout does -- as a raw,
   * parsed `<script>` body, not a call into any exported function. A string-containment test
   * ("does the source text mention 'black'") can pass while the script itself is behaviorally
   * broken (e.g. wrong operator, dead branch); running it for real against a real `document` is
   * what the console's own inline script actually does at runtime.
   */
  function runNoFlashScript(): void {
    new Function(CONSOLE_THEME_NO_FLASH_SCRIPT)();
  }

  it('sets data-theme to black when nothing is stored and the OS prefers dark', () => {
    stubPrefersLight(false);

    runNoFlashScript();

    expect(document.documentElement.dataset.theme).toBe('black');
  });

  it("applies a stored 'wireframe' preference without consulting the OS", () => {
    window.localStorage.setItem(CONSOLE_THEME_STORAGE_KEY, 'wireframe');
    stubPrefersLight(false);

    runNoFlashScript();

    expect(document.documentElement.dataset.theme).toBe('wireframe');
  });

  it('falls back to black inside its own catch when localStorage.getItem throws', () => {
    stubPrefersLight(false);
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    runNoFlashScript();

    expect(document.documentElement.dataset.theme).toBe('black');

    getItem.mockRestore();
  });
});
