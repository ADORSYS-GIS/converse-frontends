import { describe, expect, it } from 'vitest';

import { A4, monoWidth, renderPdfDocument, toWinAnsi, type PdfOp } from './pdf-document';

const CREATED_AT = new Date('2026-02-28T10:00:00Z');

function render(pages: readonly (readonly PdfOp[])[]): string {
  const bytes = renderPdfDocument({ pageSize: A4, pages, title: 'Test', createdAt: CREATED_AT });
  return Buffer.from(bytes).toString('latin1');
}

const HELLO: PdfOp[] = [{ kind: 'text', x: 48, y: 700, text: 'Hello', font: 'mono', size: 8 }];

describe('toWinAnsi', () => {
  it('downgrades the console thin space to a normal space rather than to the ? fallback', () => {
    // `formatUsd`'s thousands separator is U+2009 (`packages/ui-web/src/lib/money.ts`), which
    // WinAnsi cannot name at all. Losing the separator would still read as money; turning it into
    // `?` would not.
    expect(toWinAnsi('$1\u2009131.80')).toBe('$1 131.80');
  });

  it('keeps Latin-1 punctuation the report actually uses', () => {
    expect(toWinAnsi('a · b × c')).toBe('a · b × c');
  });

  it('maps the truncation ellipsis onto its WinAnsi codepoint, not onto the ? fallback', () => {
    expect(toWinAnsi('proj…')).toBe('proj\u0085');
  });

  it('renders a genuinely unencodable character as ?, never dropping it silently', () => {
    expect(toWinAnsi('モデル')).toBe('???');
  });
});

describe('monoWidth', () => {
  it('is exactly 0.6em per glyph — the property the ledger columns are built on', () => {
    expect(monoWidth(10, 8)).toBeCloseTo(48, 10);
  });
});

describe('renderPdfDocument', () => {
  it('emits a PDF 1.4 header and a terminating %%EOF', () => {
    const file = render([HELLO]);
    expect(file.startsWith('%PDF-1.4\n')).toBe(true);
    expect(file.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('writes a cross-reference table whose every offset lands on that object', () => {
    // Worth asserting directly even though the tests below parse the file with pdf.js: pdf.js
    // silently RECONSTRUCTS a broken xref by scanning for `obj` markers, so a corrupt table would
    // still extract the right text. This is the assertion that would actually go red.
    const file = render([HELLO, HELLO]);

    const startxref = /startxref\n(\d+)\n%%EOF/.exec(file);
    expect(startxref).not.toBeNull();

    const xref = file.slice(Number(startxref?.[1]));
    expect(xref.startsWith('xref\n0 ')).toBe(true);

    const entries = [...xref.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
    // One entry per object; the free object 0 uses the `f` marker and is not matched above.
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach((offset, index) => {
      expect(file.slice(offset)).toMatch(new RegExp(`^${index + 1} 0 obj\n`));
    });

    const size = /\/Size (\d+)/.exec(file);
    expect(Number(size?.[1])).toBe(entries.length + 1);
  });

  it('declares one page object per page and counts them in the page tree', () => {
    const file = render([HELLO, HELLO, HELLO]);
    expect(file).toContain('/Type /Pages');
    expect(/\/Count (\d+)/.exec(file)?.[1]).toBe('3');
    expect([...file.matchAll(/\/Type \/Page\b/g)]).toHaveLength(3);
  });

  it('declares a /Length that matches the content stream it precedes', () => {
    const file = render([HELLO]);
    const match = /<< \/Length (\d+) >>\nstream\n([\s\S]*?)endstream/.exec(file);
    expect(match).not.toBeNull();
    expect(match?.[2]).toHaveLength(Number(match?.[1]));
  });

  it('escapes the characters that would otherwise terminate a PDF string', () => {
    const file = render([[{ kind: 'text', x: 0, y: 0, text: 'a(b)c\\d', font: 'mono', size: 8 }]]);
    expect(file).toContain('(a\\(b\\)c\\\\d) Tj');
  });
});
