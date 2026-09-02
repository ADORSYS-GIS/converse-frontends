import { describe, expect, it } from 'vitest';

import { relationKind, RELATION_STYLE, symbolKind, SYMBOL_KIND_STYLE } from './graph';

describe('symbolKind', () => {
  it('reads a callable from its trailing () suffix', () => {
    expect(symbolKind('parse()')).toBe('callable');
  });

  it('reads an impl block by its literal label', () => {
    expect(symbolKind('impl')).toBe('impl');
  });

  it('falls back to type for anything else', () => {
    expect(symbolKind('Config')).toBe('type');
  });
});

describe('relationKind', () => {
  it('recognizes calls and method explicitly', () => {
    expect(relationKind('calls')).toBe('calls');
    expect(relationKind('method')).toBe('method');
  });

  it('treats anything else as structural containment', () => {
    expect(relationKind('contains')).toBe('contains');
    expect(relationKind('something_else')).toBe('contains');
  });
});

describe('style tables', () => {
  it('gives every symbol kind and relation kind a colour and label', () => {
    for (const kind of ['callable', 'impl', 'type'] as const) {
      expect(SYMBOL_KIND_STYLE[kind].color).toBeTruthy();
      expect(SYMBOL_KIND_STYLE[kind].label).toBeTruthy();
    }
    for (const kind of ['calls', 'method', 'contains'] as const) {
      expect(RELATION_STYLE[kind].stroke).toBeTruthy();
      expect(RELATION_STYLE[kind].label).toBeTruthy();
    }
  });
});
