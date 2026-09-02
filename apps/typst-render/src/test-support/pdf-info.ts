/**
 * A deliberately tiny PDF reader, used only by the tests.
 *
 * The golden test has to assert something stronger than "the response was non-empty" — a PDF that
 * is truncated, or that silently lost its second page, still starts with `%PDF`. Pulling in a full
 * parser for that would add a dependency to a service whose whole point is having none, so this
 * reads the two facts the assertions need (header version, page count) straight out of the bytes.
 *
 * It works because Typst writes uncompressed cross-reference and page-tree objects: the page tree
 * root carries a literal `/Count N`. If a future Typst switches to cross-reference streams this
 * will start returning `null` for `pageCount` — a loud test failure, not a silent wrong answer.
 */
export interface PdfInfo {
  /** e.g. `1.7`, from the `%PDF-1.7` header. */
  readonly version: string;
  /** Page count from the page tree's `/Count`, or `null` if no page tree was found. */
  readonly pageCount: number | null;
}

export function readPdfInfo(bytes: Buffer): PdfInfo | null {
  const header = bytes.subarray(0, 8).toString('latin1');
  const versionMatch = /^%PDF-(\d\.\d)/.exec(header);
  if (versionMatch === null) return null;

  // `latin1` rather than `utf8`: PDF bodies contain arbitrary binary (font programs, compressed
  // streams) that is not valid UTF-8, and decoding it as such would corrupt byte offsets and can
  // mangle the very `/Count` token being looked for.
  const text = bytes.toString('latin1');

  // The page tree root is the object that says `/Type /Pages` and `/Count N`. Whitespace between
  // the token and its value is not normalised in PDF, hence the permissive `\s*`.
  const pagesMatch = /\/Type\s*\/Pages\b[\s\S]{0,4000}?\/Count\s+(\d+)/.exec(text);
  const countFirstMatch = /\/Count\s+(\d+)[\s\S]{0,4000}?\/Type\s*\/Pages\b/.exec(text);
  const raw = pagesMatch?.[1] ?? countFirstMatch?.[1];

  return {
    version: versionMatch[1] as string,
    pageCount: raw === undefined ? null : Number.parseInt(raw, 10),
  };
}
