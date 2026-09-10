import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { relaxA11ySweep } from '../test/a11y-sweep';
import { startDevA11yReporter, type StopDevA11yReporter } from './axe-reporter';

/**
 * The dev reporter is the one part of the accessibility stack that ships INTO the apps (behind a
 * build-time dev guard), so "it is wired up" is not the same claim as "it works". This proves the
 * mechanism end to end against a DOM with a known violation.
 *
 * Every test here renders deliberately broken markup, which is exactly what the automatic sweep in
 * `src/test/setup.ts` exists to catch — hence `relaxA11ySweep` in `beforeEach`. It is the only
 * place in the repo that uses it, and it is the shape it was written for: the broken DOM is the
 * fixture, not a defect.
 */
describe('startDevA11yReporter', () => {
  let stop: StopDevA11yReporter | undefined;

  beforeEach(() => {
    relaxA11ySweep({ reason: 'the fixture IS the violation this reporter has to find' });
    // This reporter audits the whole `document`, not just `<body>` like the test sweep does — it
    // is meant to catch page-level failures a component test never sees. jsdom's own bare document
    // fails two of them (`html-has-lang`, `document-title`), so satisfy both and leave the
    // fixtures to supply the findings under test.
    document.documentElement.lang = 'en';
    document.title = 'probe';
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.restoreAllMocks();
  });

  it('logs the violations it finds, grouped, with the deque help URL', async () => {
    const groups: unknown[][] = [];
    vi.spyOn(console, 'groupCollapsed').mockImplementation((...args) => groups.push(args));
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const logged: unknown[][] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logged.push(args));

    // The missing `alt` is the fixture. jsx-a11y is right about it everywhere except here, where
    // an image with no alternative text is the known violation this reporter has to report.
    // eslint-disable-next-line jsx-a11y/alt-text
    render(<img src="/logo.png" />);
    stop = await startDevA11yReporter({ debounceMs: 0, appName: 'probe' });
    await vi.waitFor(() => expect(groups.length).toBeGreaterThan(0));

    expect(groups[0]?.[0]).toContain('probe · ');
    expect(groups.some((g) => String(g[0]).includes('image-alt'))).toBe(true);
    expect(logged.some((l) => String(l[0]).includes('dequeuniversity.com'))).toBe(true);
  });

  it('says nothing at all when the page is clean', async () => {
    const groupCollapsed = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    render(<img src="/logo.png" alt="The Lightbridge mark" />);
    stop = await startDevA11yReporter({ debounceMs: 0, appName: 'probe' });
    // Long enough for the initial audit to have run and returned nothing.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(groupCollapsed).not.toHaveBeenCalled();
  });

  it('installs once per page, however many times it is called', async () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');

    render(<img src="/logo.png" alt="The Lightbridge mark" />);
    stop = await startDevA11yReporter({ debounceMs: 0 });
    await startDevA11yReporter({ debounceMs: 0 });

    expect(observe).toHaveBeenCalledTimes(1);
  });
});
