import { describe, expect, it } from 'vitest';

import { filterBrandingCss } from './branding-css-filter';

describe('filterBrandingCss', () => {
  it('keeps a custom-property declaration inside :root ("top level")', () => {
    const result = filterBrandingCss(':root {\n  --color-primary: #ff6600;\n}');
    expect(result.css).toBe(':root {\n  --color-primary: #ff6600;\n}');
    expect(result.strippedSelectors).toEqual([]);
    expect(result.strippedDeclarations).toEqual([]);
  });

  it('keeps a custom-property declaration inside a [data-theme="…"] block, preserving the theme name verbatim', () => {
    const result = filterBrandingCss('[data-theme="mybrand"] {\n  --color-primary: #123456;\n}');
    expect(result.css).toBe('[data-theme="mybrand"] {\n  --color-primary: #123456;\n}');
    expect(result.strippedSelectors).toEqual([]);
  });

  it('accepts single-quoted theme selectors', () => {
    const result = filterBrandingCss("[data-theme='black'] {\n  --color-primary: red;\n}");
    expect(result.css).toContain("[data-theme='black']");
  });

  it('accepts a compound selector that is entirely :root/[data-theme] parts', () => {
    const result = filterBrandingCss(
      ':root, [data-theme="black"] {\n  --color-primary: #ff6600;\n}'
    );
    expect(result.css).toBe(':root, [data-theme="black"] {\n  --color-primary: #ff6600;\n}');
    expect(result.strippedSelectors).toEqual([]);
  });

  it('drops an entire rule whose selector is not :root or [data-theme]', () => {
    const result = filterBrandingCss('.header-brand {\n  display: none;\n}');
    expect(result.css).toBe('');
    expect(result.strippedSelectors).toEqual(['.header-brand']);
  });

  it('drops a compound selector rule if any one part is disallowed', () => {
    const result = filterBrandingCss(':root, .evil {\n  --color-primary: red;\n}');
    expect(result.css).toBe('');
    expect(result.strippedSelectors).toEqual([':root, .evil']);
  });

  it('drops a non-custom-property declaration inside an otherwise-allowed block, keeping the rest', () => {
    const result = filterBrandingCss(
      ':root {\n  --color-primary: #ff6600;\n  display: none;\n  --color-base-100: #000;\n}'
    );
    expect(result.css).toBe(':root {\n  --color-primary: #ff6600;\n  --color-base-100: #000;\n}');
    expect(result.strippedDeclarations).toEqual([':root: display: none']);
  });

  it('drops an at-rule entirely, including its body', () => {
    const result = filterBrandingCss(
      '@media (prefers-color-scheme: dark) {\n  :root { --color-primary: red; }\n}\n' +
        ':root { --color-primary: blue; }'
    );
    expect(result.css).toBe(':root {\n  --color-primary: blue;\n}');
    expect(result.strippedSelectors).toEqual(['@media (prefers-color-scheme: dark)']);
  });

  it('strips comments, including a declaration that is entirely commented out', () => {
    const result = filterBrandingCss(
      ':root {\n  /* --color-primary: commented-out; */\n  --color-primary: #ff6600;\n}'
    );
    expect(result.css).toBe(':root {\n  --color-primary: #ff6600;\n}');
  });

  it('strips a comment that spans between two rules without merging them', () => {
    const result = filterBrandingCss(
      ':root { --color-primary: red; } /* note */ [data-theme="x"] { --color-primary: blue; }'
    );
    expect(result.css).toBe(
      ':root {\n  --color-primary: red;\n}\n\n[data-theme="x"] {\n  --color-primary: blue;\n}'
    );
  });

  it('treats an unterminated comment as consuming the rest of the file, without throwing', () => {
    expect(() =>
      filterBrandingCss(':root { --color-primary: red; } /* never closed')
    ).not.toThrow();
    const result = filterBrandingCss(':root { --color-primary: red; } /* never closed');
    expect(result.css).toBe(':root {\n  --color-primary: red;\n}');
  });

  it('drops a bare top-level statement with no wrapping selector at all', () => {
    const result = filterBrandingCss('--color-primary: red;');
    expect(result.css).toBe('');
    expect(result.strippedSelectors).toEqual(['--color-primary: red']);
  });

  it('handles deeply/oddly nested braces without throwing or losing later rules', () => {
    const result = filterBrandingCss(
      '.weird { .nested { .more {} } }\n:root { --color-primary: green; }'
    );
    expect(() => result).not.toThrow();
    expect(result.css).toBe(':root {\n  --color-primary: green;\n}');
  });

  it('handles a rule with no closing brace at end of file without throwing', () => {
    expect(() => filterBrandingCss(':root { --color-primary: red;')).not.toThrow();
  });

  it('returns empty output, no stripped entries, for an empty file', () => {
    const result = filterBrandingCss('');
    expect(result).toEqual({ css: '', strippedSelectors: [], strippedDeclarations: [] });
  });

  it('returns empty output for a whitespace-only file', () => {
    const result = filterBrandingCss('\n\n   \t\n');
    expect(result.css).toBe('');
  });

  it('keeps multiple allowed blocks, each on its own', () => {
    const result = filterBrandingCss(
      ':root {\n  --a: 1;\n}\n[data-theme="black"] {\n  --a: 2;\n}\n[data-theme="wireframe"] {\n  --a: 3;\n}'
    );
    expect(result.css).toBe(
      ':root {\n  --a: 1;\n}\n\n[data-theme="black"] {\n  --a: 2;\n}\n\n[data-theme="wireframe"] {\n  --a: 3;\n}'
    );
  });

  it('drops an empty allowed block entirely (nothing worth keeping)', () => {
    const result = filterBrandingCss(':root {}');
    expect(result.css).toBe('');
    expect(result.strippedSelectors).toEqual([]);
    expect(result.strippedDeclarations).toEqual([]);
  });

  it('handles a declaration missing its trailing semicolon (last declaration in a block)', () => {
    const result = filterBrandingCss(':root {\n  --color-primary: #ff6600\n}');
    expect(result.css).toBe(':root {\n  --color-primary: #ff6600;\n}');
  });
});
