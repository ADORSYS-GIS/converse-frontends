import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The gate that guards the gate (#443).
 *
 * Every way the runtime accessibility sweep can be broken is SILENT — it passes everything instead
 * of failing loudly. Two of them were hit while building it, and neither announced itself:
 *
 *  1. `sequence.hooks` left at Vitest's default `'stack'`, which runs `afterEach` in reverse
 *     registration order and so puts Testing Library's auto-cleanup ahead of the sweep. The sweep
 *     then inspects an empty `<body>`. Measured: 0 findings across 1517 tests, versus 17 with the
 *     setting corrected.
 *  2. In a `projects` config, `sequence` written INSIDE the project entry, where Vitest ignores it
 *     in favour of the root's — same symptom.
 *
 * A third is simply deleting the `installA11ySweep` call from a setup file, which no test would
 * otherwise notice. So the wiring is asserted from source here, for every DOM workspace, and this
 * file is the reason nobody has to remember it.
 *
 * This is source inspection on purpose. The sweep cannot verify itself from inside the run it is
 * part of: whether it fired is exactly the thing in question.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');

/**
 * Every workspace that renders DOM in its tests. Kept in step with the `DOM_SURFACES` list in the
 * root `eslint.config.js` — the same set of workspaces, for the same reason.
 */
const GATED_WORKSPACES = [
  { name: 'packages/ui-web', config: 'vitest.config.ts', setup: 'src/test/setup.ts' },
  { name: 'apps/console', config: 'vitest.config.ts', setup: 'src/test/setup.ts' },
  { name: 'apps/lci', config: 'vitest.config.ts', setup: 'src/test/setup.ts' },
  { name: 'apps/authz-ui', config: 'vitest.config.ts', setup: 'src/test/setup.ts' },
  { name: 'apps/governance-auth', config: 'vitest.config.ts', setup: 'src/test/setup.ts' },
] as const;

const read = (...parts: string[]) => readFileSync(join(REPO, ...parts), 'utf8');

describe('the accessibility gate is actually installed', () => {
  it.each(GATED_WORKSPACES)(
    '$name installs the axe sweep in its Vitest setup file',
    ({ name, setup }) => {
      const source = read(name, setup);
      expect(source).toMatch(/installA11ySweep\(afterEach\)/);
      // The hook must be the one from THIS module, not one imported inside the shared sweep — see
      // `src/test/a11y-sweep.ts` for why that distinction is load-bearing under pnpm.
      expect(source).toMatch(/import \{ afterEach \} from 'vitest'/);
    }
  );

  it.each(GATED_WORKSPACES)(
    "$name sets sequence.hooks to 'list' at the ROOT of its Vitest config",
    ({ name, config }) => {
      const source = read(name, config);
      const rootIndex = source.indexOf(`sequence: { hooks: 'list' }`);
      expect(rootIndex, `${name}/${config} is missing sequence: { hooks: 'list' }`).toBeGreaterThan(
        -1
      );

      // If the config declares `projects`, the setting must appear BEFORE that key: Vitest reads
      // `sequence` from the root config only, and a copy inside a project entry is silently
      // ignored. Position is the cheapest reliable proxy for "at the root" without evaluating the
      // config, and it is exact for the shape every config in this repo uses.
      const projectsIndex = source.indexOf('projects: [');
      if (projectsIndex !== -1) {
        expect(
          rootIndex,
          `${name}/${config} declares sequence inside \`projects\`, where Vitest ignores it`
        ).toBeLessThan(projectsIndex);
      }
    }
  );

  it('runs axe against the WCAG 2.1 AA tag set, and disables only color-contrast under jsdom', () => {
    const source = read('packages/ui-web', 'src/test/a11y.ts');
    expect(source).toContain(`['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']`);

    // The disabled-rule map may hold exactly one entry. A second one is a policy change, not a
    // configuration tweak, and needs the written reason this assertion forces someone to add.
    const disabled = /JSDOM_UNCOMPUTABLE_RULES[^=]*=\s*\{([^}]*\}[^}]*)\}/s.exec(source);
    expect(disabled, 'JSDOM_UNCOMPUTABLE_RULES not found in its expected shape').not.toBeNull();
    const ruleIds = [...(disabled?.[1] ?? '').matchAll(/'([a-z][a-z0-9-]*)':/g)].map((m) => m[1]);
    expect(ruleIds).toEqual(['color-contrast']);
  });

  it('leaves color-contrast ENABLED for the Storybook run, where a real browser can measure it', () => {
    const preview = read('packages/ui-web', '.storybook/preview.tsx');
    expect(preview).toContain(`a11y: { test: 'error' }`);
    // Matching a DISABLE, not the mere word — the comment above that parameter explains why the
    // rule is on here and off under jsdom, and naming it there must stay allowed.
    expect(preview).not.toMatch(/['"]color-contrast['"]\s*:\s*\{\s*enabled:\s*false/);
    expect(preview).not.toMatch(/id:\s*['"]color-contrast['"],\s*enabled:\s*false/);

    // Both themes, or the light palette is audited only where a story happens to have a light
    // variant. See `vitest.storybook.config.mts`.
    const config = read('packages/ui-web', 'vitest.storybook.config.mts');
    expect(config).toContain(`initialGlobals: { theme: 'black' }`);
    expect(config).toContain(`initialGlobals: { theme: 'wireframe' }`);
  });

  it('keeps jsx-a11y at error level across every DOM workspace', () => {
    const config = read('eslint.config.js');
    expect(config).toContain('jsxA11y.flatConfigs.recommended');
    // The two rules `recommended` ships as `off` that this repo turns on. Dropping either is a
    // silent loosening of the static gate.
    expect(config).toContain(`'jsx-a11y/control-has-associated-label'`);
    expect(config).toContain(`'jsx-a11y/anchor-ambiguous-text': 'error'`);

    for (const { name } of GATED_WORKSPACES) {
      expect(config, `${name} is not in the eslint DOM_SURFACES list`).toContain(
        `'${name}/**/*.{js,jsx,ts,tsx}'`
      );
    }
  });
});
