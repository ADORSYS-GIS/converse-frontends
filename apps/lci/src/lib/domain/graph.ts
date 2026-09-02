import { SPEC_ACCENT, SPEC_BASELINE, SPEC_GREY_RAMP } from '@lightbridge/ui-web/src/chart-tokens';

/**
 * Code-graph domain helpers. `symbolKind`'s inference is an approximation, not a precise
 * classification: the backend's `:Symbol` nodes don't persist a `kind` field, so a label's own
 * shape — a callable always gets a `()` suffix — is the only signal available.
 *
 * Colour is spent deliberately: this design system has exactly one accent (`--color-primary`,
 * "the signal") and a 4-step grey ramp for everything else. The signal goes to `calls` — the one
 * edge that is an actual call site rather than structural scaffolding — so it reads as the
 * strongest visual weight on the graph; every node kind and the `method`/`contains` relations
 * read from the grey ramp instead.
 */

export type SymbolKind = 'callable' | 'impl' | 'type';

export function symbolKind(label: string): SymbolKind {
  if (label === 'impl') return 'impl';
  if (label.endsWith('()')) return 'callable';
  return 'type';
}

export const SYMBOL_KIND_STYLE: Record<SymbolKind, { color: string; label: string }> = {
  callable: { color: SPEC_GREY_RAMP[0], label: 'Function / method' },
  impl: { color: SPEC_GREY_RAMP[1], label: 'Impl block' },
  type: { color: SPEC_GREY_RAMP[2], label: 'Type / module' },
};

export type RelationKind = 'calls' | 'method' | 'contains';

export function relationKind(relation: string): RelationKind {
  if (relation === 'calls') return 'calls';
  if (relation === 'method') return 'method';
  return 'contains';
}

export const RELATION_STYLE: Record<RelationKind, { stroke: string; label: string }> = {
  calls: { stroke: SPEC_ACCENT, label: 'calls' },
  method: { stroke: SPEC_GREY_RAMP[1], label: 'method' },
  contains: { stroke: SPEC_BASELINE, label: 'contains' },
};

/** The one accent colour, reused for the selected-node border — the strongest available hue,
 *  spent on "the thing that's selected". */
export const SELECTION_COLOR = SPEC_ACCENT;
