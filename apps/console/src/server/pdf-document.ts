/**
 * A minimal, dependency-free PDF 1.4 writer — just enough of the format to emit a paginated
 * text-and-hairlines document. It knows nothing about consumption reports;
 * `consumption-pdf.ts` builds the report *on top of* it.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY NOT A LIBRARY
 * ---------------------------------------------------------------------------------------------
 * The workspace had no PDF dependency at all before this change (checked: no `pdfkit`, `pdf-lib`,
 * `jspdf`, `pdfmake`, `@react-pdf/renderer` anywhere in `pnpm-lock.yaml`), so every option was a
 * NEW dependency, and each one was measured rather than assumed:
 *
 *   pdfkit 0.20.1          25 MB installed (10 MB pdfkit + 5.6 MB fontkit + brotli/noble/…),
 *                          actively maintained. Reads its Standard-14 `.afm` metrics off disk at
 *                          runtime (`js/data/*.afm`), which `output: 'standalone'`'s dependency
 *                          tracing has to be told about explicitly — a deployment failure mode
 *                          that only shows up in the container, not in `next build`.
 *   pdf-lib 1.17.1         19 MB unpacked, last published 2022 — unmaintained, so it fails the
 *                          "actively maintained" bar on its own.
 *   jspdf 4.2.1            30 MB unpacked, and browser-first: it would put a PDF engine in the
 *                          client bundle to render a report the server already holds the data for.
 *   @react-pdf/renderer    pulls pdfkit anyway, plus a React reconciler.
 *
 * All of that buys font embedding, image support, vector graphics, text shaping and encryption.
 * This document needs none of it: it is monospaced text and 0.5pt horizontal rules, set in the
 * Standard-14 `Courier`/`Helvetica` faces that every PDF consumer is required by the spec to have
 * built in — so there is nothing to embed and no font metrics to look up (Courier's advance width
 * is exactly 0.6em for every glyph, which is also what makes the ledger columns align by
 * construction rather than by measurement).
 *
 * The trade, stated plainly: this file is ~200 lines of format we now own and must maintain,
 * against ~25 MB of dependency, a runtime `fs` read inside a Next.js standalone build, and a
 * supply-chain surface this repo already manages aggressively (see the CVE-driven `overrides`
 * block in `pnpm-workspace.yaml`). Because we own it, the tests parse the output back with
 * Mozilla's pdf.js (`unpdf`, devDependency) rather than trusting this writer's own idea of what
 * it wrote — an independent reader is the only assertion worth making about a binary format.
 *
 * NOT supported, deliberately: images, embedded fonts, non-Latin scripts, compression,
 * encryption, links, outlines. If a future report needs any of those, take the dependency then —
 * that is the point at which a library starts earning its size.
 */

/**
 * The Standard-14 faces this writer exposes. Every conforming PDF reader ships these, so they
 * are referenced by name and never embedded.
 */
export type PdfFont = 'mono' | 'mono-bold' | 'sans' | 'sans-bold';

const FONT_RESOURCE: Record<PdfFont, string> = {
  mono: 'F1',
  'mono-bold': 'F2',
  sans: 'F3',
  'sans-bold': 'F4',
};

/** Courier is metrically fixed at 0.6em per glyph — the whole reason the ledger columns need no
 *  font-metric table. */
export const MONO_ADVANCE_EM = 0.6;

/** Width of `characters` glyphs of `Courier` at `size` points. */
export function monoWidth(characters: number, size: number): number {
  return characters * size * MONO_ADVANCE_EM;
}

export type PdfText = {
  kind: 'text';
  x: number;
  /** Distance from the BOTTOM of the page, as PDF user space measures it. */
  y: number;
  text: string;
  font: PdfFont;
  size: number;
  /** 0 = black, 1 = white. Greyscale only — this document has no colour. */
  grey?: number;
};

export type PdfRule = {
  kind: 'rule';
  x: number;
  y: number;
  width: number;
  thickness?: number;
  grey?: number;
};

export type PdfOp = PdfText | PdfRule;

export type PdfPageSize = { width: number; height: number };

/** ISO A4 in points, the sheet a European finance report is printed on. */
export const A4: PdfPageSize = { width: 595.28, height: 841.89 };

export type PdfDocumentInput = {
  pageSize: PdfPageSize;
  pages: readonly (readonly PdfOp[])[];
  title: string;
  /** Stamped into the Info dictionary. Passed in (never read off the clock in here) so the same
   *  inputs always produce the same bytes — a generator that is not reproducible cannot be
   *  asserted on. */
  createdAt: Date;
};

// ── Text encoding ────────────────────────────────────────────────────────────────────────────

/**
 * WinAnsi (≈ CP1252) is the encoding declared on every font below, so a string has to be reduced
 * to codepoints that encoding can actually name.
 *
 * `U+2009 THIN SPACE` is the one that matters in practice: it is the console's thousands
 * separator (`packages/ui-web/src/lib/money.ts`, "$1 131.80"), and WinAnsi has no thin space at
 * all. It becomes a normal space here rather than the `?` fallback — the grouping stays visible
 * and the digits stay correct, which is the whole job of the separator. That substitution happens
 * at the ENCODING layer, not by reaching for a local `toFixed`: the numbers in the report are the
 * numbers `formatUsd` produced, byte for byte, apart from the width of one space character.
 */
const WIN_ANSI_SPECIALS: ReadonlyMap<number, number> = new Map([
  [0x20ac, 0x80], // €
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85], // …
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x2030, 0x89],
  [0x2039, 0x8b],
  [0x2018, 0x91], // '
  [0x2019, 0x92], // '
  [0x201c, 0x93], // "
  [0x201d, 0x94], // "
  [0x2022, 0x95], // •
  [0x2013, 0x96], // –
  [0x2014, 0x97], // —
  [0x203a, 0x9b],
  [0x2009, 0x20], // THIN SPACE -> SPACE, see above
  [0x00a0, 0x20], // NBSP -> SPACE
]);

/** Anything with no WinAnsi codepoint renders as `?` — visible and honest, never dropped. */
const UNENCODABLE = 0x3f;

export function toWinAnsi(text: string): string {
  let out = '';
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? UNENCODABLE;
    const mapped = WIN_ANSI_SPECIALS.get(codePoint);
    if (mapped !== undefined) {
      out += String.fromCharCode(mapped);
    } else if (codePoint >= 0x20 && codePoint <= 0x7e) {
      out += character;
    } else if (codePoint >= 0xa1 && codePoint <= 0xff) {
      // Latin-1 supplement is byte-identical in WinAnsi (·, é, £, …).
      out += character;
    } else {
      out += String.fromCharCode(UNENCODABLE);
    }
  }
  return out;
}

/** PDF literal-string escaping — the three characters that would otherwise end the string. */
function pdfString(text: string): string {
  return `(${toWinAnsi(text).replace(/[\\()]/g, (match) => `\\${match}`)})`;
}

/** Every byte this writer emits is Latin-1, so the string length IS the byte length — which is
 *  what makes the `/Length` and cross-reference offsets below trivially correct. */
function latin1(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}

/** Points, to two decimals — enough for a 595pt sheet, and it keeps the streams small. */
function pt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function grey(value: number): string {
  return value === 0 ? '0' : value.toFixed(2);
}

// ── Content streams ──────────────────────────────────────────────────────────────────────────

function contentStream(ops: readonly PdfOp[]): string {
  const parts: string[] = [];
  for (const op of ops) {
    if (op.kind === 'rule') {
      parts.push(
        `${grey(op.grey ?? 0.75)} G`,
        `${pt(op.thickness ?? 0.5)} w`,
        `${pt(op.x)} ${pt(op.y)} m ${pt(op.x + op.width)} ${pt(op.y)} l S`
      );
      continue;
    }
    parts.push(
      'BT',
      `/${FONT_RESOURCE[op.font]} ${pt(op.size)} Tf`,
      `${grey(op.grey ?? 0)} g`,
      `1 0 0 1 ${pt(op.x)} ${pt(op.y)} Tm`,
      `${pdfString(op.text)} Tj`,
      'ET'
    );
  }
  return `${parts.join('\n')}\n`;
}

/** `D:YYYYMMDDHHmmSS+00'00'` — the PDF date syntax, always stated in UTC. */
function pdfDate(date: Date): string {
  const iso = date.toISOString();
  return `D:${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}+00'00'`;
}

// ── Document assembly ────────────────────────────────────────────────────────────────────────

/**
 * Serialises the pages into a complete PDF file.
 *
 * The result is a single `Uint8Array` rather than a `ReadableStream`, unlike the CSV sibling, and
 * that is forced by the format, not a shortcut: a PDF ends with a cross-reference table listing
 * the BYTE OFFSET of every object in the file, so the last object has to exist before the trailer
 * can be written. Streaming would mean buffering the whole body anyway and lying about having
 * streamed it. The document is bounded in any case — one row per (project, model) pair for one
 * month.
 */
export function renderPdfDocument(input: PdfDocumentInput): Uint8Array<ArrayBuffer> {
  const { pageSize, pages, title, createdAt } = input;

  // Object 1 is the catalog, 2 the page tree, 3-6 the fonts; pages and their content streams
  // follow, and the Info dictionary is last.
  const FIRST_PAGE_OBJECT = 7;
  const pageObjectNumbers = pages.map((_, index) => FIRST_PAGE_OBJECT + index * 2);
  const infoObjectNumber = FIRST_PAGE_OBJECT + pages.length * 2;

  const bodies: string[] = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  ];

  const resources =
    '<< /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> /ProcSet [/PDF /Text] >>';

  pages.forEach((ops, index) => {
    const contentsNumber = pageObjectNumbers[index] + 1;
    bodies.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(pageSize.width)} ${pt(pageSize.height)}] /Resources ${resources} /Contents ${contentsNumber} 0 R >>`
    );
    const stream = contentStream(ops);
    bodies.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  bodies.push(
    `<< /Title ${pdfString(title)} /Producer (Lightbridge Console) /Creator (Lightbridge Console) /CreationDate (${pdfDate(createdAt)}) >>`
  );

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  const write = (text: string) => {
    const bytes = latin1(text);
    chunks.push(bytes);
    offset += bytes.length;
  };

  write('%PDF-1.4\n');
  // The conventional binary marker: it tells transfer tools this is not a text file.
  write('%âãÏÓ\n');

  const offsets: number[] = [];
  bodies.forEach((body, index) => {
    offsets.push(offset);
    write(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });

  const xrefOffset = offset;
  write(`xref\n0 ${bodies.length + 1}\n`);
  write('0000000000 65535 f \n');
  for (const objectOffset of offsets) {
    write(`${String(objectOffset).padStart(10, '0')} 00000 n \n`);
  }
  write(
    `trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R /Info ${infoObjectNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const output = new Uint8Array(offset);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}
