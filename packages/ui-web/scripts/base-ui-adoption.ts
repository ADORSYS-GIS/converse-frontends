// Which components delegate behaviour to Base UI, and which reimplement something it ships.
//
// This exists because the owner caught a false claim (2026-08-29): I asserted "Base UI adoption is
// near-complete" while `components/button` imported none and Base UI 1.7.0 ships `button`. The
// class-budget script measures daisyUI PAINT and says nothing about behaviour, and I reported the
// two as one number. They are different axes and now have different meters.
//
// `EXPECTED` is the claim under test: for each component, the Base UI primitive it should be built
// on. `null` means "Base UI genuinely ships nothing for this" — every `null` carries its reason,
// because an unexamined `null` is how the button gap survived.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const EXPECTED: Record<string, string | null> = {
  // — delegating correctly
  'account-badge': 'menu',
  'account-menu': 'menu',
  'account-name-dialog': 'dialog',
  'bottom-sheet': 'drawer',
  checkbox: 'checkbox',
  'create-api-key-dialog': 'dialog',
  'create-project-dialog': 'dialog',
  'date-range-field': 'popover',
  field: 'field',
  meter: 'meter',
  'project-name-dialog': 'dialog',
  'report-export-panel': 'switch',
  'scope-select': 'select',
  'segmented-control': 'toggle-group',
  'select-field': 'select',
  tooltip: 'tooltip',
  'typed-confirm-dialog': 'alert-dialog',

  // — GAPS: Base UI ships this and we do not use it
  button: 'button',
  'row-action-group': 'separator',
  'secret-reveal': 'input',
  'nav-spine': 'navigation-menu',
  'sub-nav': 'navigation-menu',
  'console-header': 'toolbar',

  // — nothing upstream, with the reason
  'chart-axis': null, // SVG primitive
  'chart-legend': null, // SVG primitive
  'chart-tooltip': null, // point-anchored: Floating UI virtual element, not a DOM anchor
  chevron: null, // a static path
  'command-palette': null, // cmdk owns the palette (ADR 0010)
  'console-shell': null, // the flush full-height rail contract; daisy `drawer` rejected
  'error-line': null, // a status line, not a control
  'histogram-chart': null, // SVG primitive
  'inline-status': null, // a status line, not a control
  'latency-ridgeline': null, // SVG primitive
  'ledger-table': null, // Base UI ships no table
  'mutation-failure-banner': null, // deliberately NOT a toast: persistent, in-flow (ADR 0008)
  'rail-panel': null, // a padded div
  'review-detail-panel': null, // a composition of other primitives
  'section-sheet': null, // composes BottomSheet, which is the drawer
  'section-sheet-trigger': null, // renders our Button; the gap is Button's
  'selection-sheet': null, // composes SectionSheet, which composes BottomSheet
  'share-bar': null, // SVG-ish part-to-whole mark
  'skeleton-metric': null, // daisy `skeleton` paint only
  'skeleton-row': null, // daisy `skeleton` paint only
  sparkline: null, // SVG primitive
  'spend-series-chart': null, // SVG primitive
  'stat-card': null, // a panel
  'status-text': null, // status is text
  'theme-toggle': null, // three-state cycle; Base UI `toggle` is two-state
};

export interface AdoptionRow {
  component: string;
  expected: string | null;
  imports: string[];
  /** `ok` delegating or legitimately bespoke · `gap` Base UI ships it and we ignore it */
  verdict: 'ok' | 'gap';
}

export function auditAdoption(root: string): AdoptionRow[] {
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((component) => {
      const dir = join(root, component);
      const imports = [
        ...new Set(
          readdirSync(dir)
            .filter((f) => f.endsWith('.tsx') && !f.includes('.test.') && !f.includes('.stories.'))
            .flatMap((f) => [
              ...readFileSync(join(dir, f), 'utf8').matchAll(/@base-ui\/react\/([a-z-]+)/g),
            ])
            .map((m) => m[1]),
        ),
      ].sort();
      const expected = EXPECTED[component] ?? null;
      const verdict: AdoptionRow['verdict'] =
        expected === null || imports.includes(expected) ? 'ok' : 'gap';
      return { component, expected, imports, verdict };
    })
    .sort((a, b) => a.component.localeCompare(b.component));
}
