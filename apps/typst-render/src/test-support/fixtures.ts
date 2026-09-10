/**
 * The golden fixture: the smallest document that still exercises every moving part of the
 * contract — `sys.inputs` -> `data.json`, an asset written to a nested path and drawn by the
 * template, and a second page so a page-count assertion can catch a truncated render.
 */

/** A 3-colour SVG small enough to read inline; it is what `image()` in the template loads. */
export const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30" viewBox="0 0 60 30">' +
  '<rect width="60" height="30" fill="#1f3a8a"/>' +
  '<circle cx="15" cy="15" r="9" fill="#f5b301"/>' +
  '<rect x="30" y="9" width="24" height="12" fill="#ffffff"/>' +
  '</svg>';

export const GOLDEN_TEMPLATE = `#let report = json(sys.inputs.at("data"))
#set page(width: 240pt, height: 160pt, margin: 14pt)
#set text(size: 9pt)

= #report.title

#image("brand/logo.svg", width: 48pt)

Account: #report.account \\
Total requests: #report.total

#pagebreak()

== Appendix

#for row in report.rows [
  - #row.label: #row.value
]
`;

export const GOLDEN_DATA = {
  title: 'Usage report',
  account: 'acct-golden',
  total: 4242,
  rows: [
    { label: 'gpt-4o', value: 2400 },
    { label: 'claude-opus', value: 1842 },
  ],
};

export const GOLDEN_ASSETS: Record<string, string> = {
  // A nested path on purpose: it proves the service creates intermediate directories and that a
  // relative `image()` lookup resolves against the render root.
  'brand/logo.svg': Buffer.from(LOGO_SVG, 'utf8').toString('base64'),
};

/** A template that is syntactically fine but references a name Typst does not know -> exit != 0. */
export const BROKEN_TEMPLATE = '= Broken\n\n#this-function-does-not-exist()\n';
