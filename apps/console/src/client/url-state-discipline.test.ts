import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A structural regression guard for the three rules ADR 0011 states as review criteria rather than
 * as code — the ones a reviewer would otherwise have to re-derive by hand on every PR:
 *
 *  1. **"new unexplained `useState` in view code is a review defect"** (Decision 3). Every
 *     surviving local-state site in `apps/console/src` carries a one-line justification; this
 *     asserts that the justification is actually there, and lists the survivors by name so that
 *     *adding* one is a visible diff on this file rather than a silent drift back to component
 *     state.
 *  2. **One module owns the param contract** (Decision 1 + Consequences: "param names are a
 *     contract"). If any other file may reach for `useQueryState`, the contract stops being
 *     inspectable and renames stop being reviewable.
 *  3. **`packages/ui-web` never imports nuqs** (Decision 4) — the package stays presentational and
 *     framework-agnostic, controlled through props so the app can own its state in the URL.
 *
 * Source-shape assertions, not render tests, because all three properties are about the *tree*
 * rather than about any one component's output. The behavioural half of the ADR is checked in
 * `url-state.test.ts` (the contract) and `url-state-cross-zone.test.tsx` (the bus).
 */

const CONSOLE_SRC = join(__dirname, '..');
const UI_WEB_SRC = join(__dirname, '..', '..', '..', '..', 'packages', 'ui-web', 'src');
const URL_STATE_MODULE = join(CONSOLE_SRC, 'client', 'url-state.ts');
const ROOT_LAYOUT = join(CONSOLE_SRC, 'app', 'layout.tsx');

/** The marker each surviving local-state site puts in its justification comment. */
const JUSTIFICATION = 'SANCTIONED LOCAL STATE';
/** How far above a `useState` call the justification may sit (a doc comment is several lines). */
const JUSTIFICATION_WINDOW = 12;

const LOCAL_STATE_CALL = /\buse(State|Reducer)\s*[<(]/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.ts') || full.endsWith('.tsx') ? [full] : [];
  });
}

function isTest(file: string): boolean {
  return file.endsWith('.test.ts') || file.endsWith('.test.tsx');
}

const consoleFiles = walk(CONSOLE_SRC).filter((file) => !isTest(file));

function localStateSites(file: string): { line: number; justified: boolean }[] {
  const lines = readFileSync(file, 'utf8').split('\n');
  return lines.flatMap((line, index) => {
    if (!LOCAL_STATE_CALL.test(line)) return [];
    const window = lines.slice(Math.max(0, index - JUSTIFICATION_WINDOW), index).join('\n');
    return [{ line: index + 1, justified: window.includes(JUSTIFICATION) }];
  });
}

describe('ADR 0011 discipline', () => {
  it('justifies every surviving useState/useReducer in apps/console/src', () => {
    const unjustified = consoleFiles.flatMap((file) =>
      localStateSites(file)
        .filter((site) => !site.justified)
        .map((site) => `${file}:${site.line}`)
    );

    expect(unjustified).toEqual([]);
  });

  it('keeps the list of sanctioned local-state sites short and named', () => {
    const withState = consoleFiles
      .filter((file) => localStateSites(file).length > 0)
      .map((file) => file.slice(CONSOLE_SRC.length + 1))
      .sort();

    // The exceptions ADR 0011 Decision 3 sanctions, and nothing else:
    //  - the command palette's open flag (ephemeral chrome interaction — a launcher, not a view),
    //  - the auth doorway's pre-redirect status (in-flight submit, one paint before navigating),
    //  - the reviewer's unsent decision note (a pre-submit draft that must never reach a URL).
    expect(withState).toEqual([
      join('client', 'console-chrome.tsx'),
      join('containers', 'auth-view.tsx'),
      join('containers', 'use-admin-screen.ts'),
    ]);
  });

  it('declares query params in exactly one module', () => {
    const declarers = consoleFiles.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /from '(nuqs|nuqs\/[^']*)'/.test(source);
    });

    // `url-state.ts` owns the contract; the root layout mounts the adapter. Nothing else.
    expect(declarers.sort()).toEqual([ROOT_LAYOUT, URL_STATE_MODULE].sort());
  });

  it('keeps nuqs out of packages/ui-web entirely', () => {
    const importers = walk(UI_WEB_SRC).filter((file) =>
      /from '(nuqs|nuqs\/)/.test(readFileSync(file, 'utf8'))
    );

    expect(importers).toEqual([]);
  });

  it("leaves refine's own location sync off, so nuqs is the only URL writer", () => {
    const providers = readFileSync(join(CONSOLE_SRC, 'client', 'console-providers.tsx'), 'utf8');

    expect(providers).toContain('syncWithLocation: false');
  });
});
