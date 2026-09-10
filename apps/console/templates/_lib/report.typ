// ─────────────────────────────────────────────────────────────────────────────────────────────
// The shared report library (converse-frontends#453).
//
// Every shipped template starts with:
//
//     #import "_lib/report.typ": *
//     #let report = json(sys.inputs.at("data"))
//     #show: report-page.with(report)
//
// `sys.inputs.data` is a FILENAME, not the payload — the `typst-render` service writes the JSON
// beside the template and passes `--input data=data.json` (apps/typst-render/README.md). This
// library is sent with every render job as the asset `_lib/report.typ`, so the import resolves
// inside the service's per-request sandbox.
//
// LANGUAGE: a template renders, the console translates. Typst has no i18n runtime and this file
// can read nothing but `data.json`, so every word printed on the DOCUMENT's own behalf — not the
// data's — arrives pre-translated in `report.labels` (`generated`, `template`, `noRows`), resolved
// server-side against the reader's own locale (ADR 0017, `src/server/reports/report-data.ts`).
// An operator's own override gets translated chrome for free: it reads `report.labels.generated`
// exactly as this file does, without having to know a locale exists.
//
// WHAT A TEMPLATE MAY DECIDE: document chrome — the header, the order of the sections, which
// captions to print, page size, fonts. That is the whole of it. It cannot decide which panels
// exist or what they queried: `report.panels` arrives already resolved, already queried, already
// formatted, in `dashboards.yaml` order. A template that omits a panel omits it from ITS OWN
// report; it cannot make the console fetch anything.
//
// OVERRIDING: copy the route's `report.typ` to
// `${CONSOLE_TEMPLATES_DIR}/<route>/report.typ` and edit it. Lookup is per FILE, so overriding one
// route leaves every other report on its shipped template. This library is deliberately NOT
// overridable — an override of it would restyle every report at once, which is not a per-route
// decision.
//
// SHIPPING ARTWORK WITH AN OVERRIDE: every non-`.typ` file beside that `report.typ` arrives as an
// asset keyed by its path relative to that directory, so a custom template draws its own logo with
// `#image("logo.png")` — NO leading slash, because a per-route template compiles as `main.typ` AT
// the render root, unlike this library. The deployment-wide letterhead is a different thing and
// needs no template at all: see `brand-mark` below.
//
// SELF-CONTAINED, ALWAYS: no `@preview` imports. The sidecar's package path is an empty
// per-request directory and it is expected to run with no egress, so an import would surface as a
// compile error naming the package. Everything below is stdlib Typst.
// ─────────────────────────────────────────────────────────────────────────────────────────────

#let ink = rgb("#1a1a1a")
#let subtle = rgb("#6b6b6b")
#let rule-colour = rgb("#cfcfcf")
#let hairline = rgb("#dedede")

// `YYYY-MM-DDTHH:MM:SS.sssZ` -> `YYYY-MM-DD HH:MM UTC`. The console states every instant in UTC,
// on screen and on paper alike, and a report read in another timezone must not silently shift.
#let utc-stamp(iso) = {
  let parts = iso.split("T")
  if parts.len() < 2 { return iso }
  parts.at(0) + " " + parts.at(1).slice(0, 5) + " UTC"
}

// ── Branding ──────────────────────────────────────────────────────────────────────────────────
// `report.branding` is `{logo?, name?}`, absent entirely when the deployment configured no brand
// (apps/console/src/server/reports/report-branding.ts). `logo` is an asset path inside the render
// root, written there from the SAME file the console header serves — a report cannot fetch a URL,
// so the bytes travel with the job.
//
// Root-absolute (`"/" + logo`) for exactly the reason `panel-chart` is: Typst resolves a relative
// `image()` against the file that CALLS it, and this library lives in `_lib/`, so `image("branding/
// logo.png")` here would look for `_lib/branding/logo.png` and fail. A CUSTOMER's own template
// sits at the render root as `main.typ`, which is why ITS `image("logo.png")` — a sibling asset,
// see `template-assets.ts` — needs no leading slash.
//
// Three rungs, and the last one is today's header exactly: the logo when there is one, the brand
// name when there is not, and nothing at all when neither is configured. A missing logo is never
// a missing report.
#let brand-logo-height = 28pt

#let brand-mark(report) = {
  if "branding" not in report or report.branding == none { return }
  let brand = report.branding
  if "logo" in brand and brand.logo != none {
    image("/" + brand.logo, height: brand-logo-height, fit: "contain")
  } else if "name" in brand and brand.name != none {
    text(size: 8.5pt, fill: subtle, tracking: 0.08em)[#upper(brand.name)]
  }
}

// Is there anything to put left of the title? Asked separately from drawing it so the header can
// choose between a one-column and a two-column grid — an empty first column would leave a gap
// that reads as a missing image.
#let has-brand-mark(report) = {
  "branding" in report and report.branding != none and (
    ("logo" in report.branding and report.branding.logo != none)
      or ("name" in report.branding and report.branding.name != none)
  )
}

// The document shell: page geometry, type, and the header every report opens with.
#let report-page(report, body) = {
  set page(
    paper: "a4",
    margin: (x: 18mm, y: 16mm),
    footer: context [
      #set text(size: 7.5pt, fill: subtle)
      #line(length: 100%, stroke: 0.4pt + hairline)
      #v(2pt)
      #grid(
        columns: (1fr, auto),
        align(left)[#report.route · #report.labels.template: #report.template.origin],
        align(right)[#counter(page).display("1 / 1", both: true)],
      )
    ],
  )
  set text(size: 9.5pt, fill: ink)
  set par(justify: false, leading: 0.6em)

  // ── Header ────────────────────────────────────────────────────────────────────────────────
  // The brand mark sits LEFT of the title in a two-column grid, and the grid only exists when
  // there is a mark: a one-column layout with an empty first cell would leave a gap that reads
  // as a logo that failed to load.
  let title-block = {
    text(size: 17pt, weight: "bold")[#report.title]
    v(2pt)
    text(size: 8.5pt, fill: subtle)[
      #report.rangeLabel · #utc-stamp(report.window.start) – #utc-stamp(report.window.end)
    ]
    if report.filters.len() > 0 {
      linebreak()
      text(size: 8.5pt, fill: subtle)[
        #report.filters.map(f => f.label + ": " + f.value).join(" · ")
      ]
    }
    linebreak()
    text(size: 8.5pt, fill: subtle)[#report.labels.generated #utc-stamp(report.generatedAt)]
  }

  if has-brand-mark(report) {
    grid(
      columns: (auto, 1fr),
      column-gutter: 12pt,
      align: (left + horizon, left + top),
      brand-mark(report),
      title-block,
    )
  } else {
    title-block
  }
  v(4pt)
  line(length: 100%, stroke: 0.6pt + rule-colour)
  v(8pt)

  body
}

// One panel: its title, its optional subtitle, whatever body it was given, and its honesty
// caption. `panel` is the whole panel object so a caption never has to be passed separately and
// therefore can never be forgotten.
#let panel(p, body) = {
  block(breakable: true, width: 100%)[
    #text(size: 11pt, weight: "bold")[#p.title]
    #if "subtitle" in p and p.subtitle != none {
      linebreak()
      text(size: 8pt, fill: subtle)[#p.subtitle]
    }
    #v(4pt)
    #body
    #if "caption" in p and p.caption != none {
      v(3pt)
      text(size: 7.5pt, fill: subtle)[#p.caption]
    }
  ]
  v(10pt)
}

// A row of stat cards. Rendered as a grid rather than boxes: on paper the numeral is the signal
// and a drawn card is decoration that costs vertical space a report cannot spare.
#let stat-grid(stats) = {
  grid(
    columns: (1fr,) * calc.min(stats.len(), 4),
    column-gutter: 10pt,
    row-gutter: 8pt,
    ..stats.map(s => [
      #text(size: 7.5pt, fill: subtle)[#upper(s.label)]
      #linebreak()
      #text(size: 15pt, weight: "bold")[#s.value]
      #if "delta" in s and s.delta != none {
        linebreak()
        // Never green/red — the console's own delta rule, which is a colour-blindness and an
        // honesty decision, not a palette one. On paper it is words.
        text(size: 7.5pt, fill: subtle)[#s.delta]
      }
    ]),
  )
}

// Does this cell read as a QUANTITY? Numbers, money, a `<1%` share, and the dash that stands for
// "not measured" all belong in a right-aligned column; a name or an id does not.
#let quantity-cell(cell) = {
  let s = str(cell).trim()
  s == "" or s == "—" or s.starts-with(regex("[0-9$<]"))
}

// A table from `{columns, rows}`. Every cell is already a formatted string — the console formatted
// it with the same functions the screen used, so a figure cannot differ between the two.
//
// Alignment is DERIVED from the cells rather than passed in, so a template never has to declare a
// column layout that could drift from the data: a column is right-aligned only when every one of
// its cells reads as a quantity. `docs/design/console-redesign/README.md` §2.2 — "numeric columns
// are right-aligned; the digits line up as a ledger" — and a right-aligned MODEL column, which is
// what a fixed "first column left, rest right" rule produces, is not that.
#let table-from-rows(report, t) = {
  if t.rows.len() == 0 {
    return text(size: 8pt, fill: subtle)[#report.labels.noRows]
  }
  let numeric = range(t.columns.len()).map(col => t.rows.all(row => quantity-cell(row.at(col))))
  table(
    columns: (auto,) * t.columns.len(),
    align: (col, _) => if numeric.at(col) { right } else { left },
    stroke: (x: none, y: 0.4pt + hairline),
    inset: (x: 5pt, y: 3.5pt),
    table.header(..t.columns.map(c => text(size: 7.5pt, fill: subtle)[#upper(c)])),
    ..t.rows.flatten().map(cell => text(size: 8.5pt)[#cell]),
  )
}

// A chart panel's SVG. `p.chart` is a path inside the RENDER ROOT (`panels/<id>.svg`), written
// there by the service from the request's `assets`.
//
// The leading `/` is load-bearing, not decoration. Typst resolves a relative `image()` path
// against the file doing the CALLING — which is this library, living in `_lib/` — so a bare
// `image("panels/x.svg")` here looks for `_lib/panels/x.svg` and fails with "file not found",
// even though the asset is exactly where the console put it. A root-absolute path is resolved
// against `--root .`, the render root, which is what the asset paths are relative to. (Found by
// the live-renderer integration test, not by reading the docs.)
//
// `height` is capped as well as `width` set, with `fit: "contain"`: a chart SVG's aspect ratio is
// its own (a time-series board is wide, a ring is square), and `width: 100%` alone scales a square
// ring to the full text width — which on A4 is a 174 mm circle that eats an entire page. Both
// bounds plus `contain` means every chart is at most this tall, whatever shape it is, and none is
// distorted.
// A4 minus this template's own 18mm side margins.
#let chart-max-width = 174mm
#let chart-max-height = 62mm

#let panel-chart(p) = {
  let aspect = if "chartAspect" in p and p.chartAspect != none { p.chartAspect } else { 2.0 }
  // Bound by whichever edge binds FIRST, so neither shape reserves a box it does not fill: a wide
  // time-series board is bounded by the text width, a square ring by the height cap.
  if aspect >= chart-max-width / chart-max-height {
    image("/" + p.chart, width: 100%)
  } else {
    align(center, image("/" + p.chart, height: chart-max-height))
  }
}

// The one thing a panel can say instead of data. Stated, never skipped: a section missing from a
// report is indistinguishable from a panel that genuinely had no usage.
#let panel-unavailable(p) = {
  text(size: 8.5pt, fill: rgb("#b4441c"))[#p.unavailable]
}

// The DEFAULT rendering of one panel — chart, then stats, then table, each only if present, and
// the table only when the reader asked for tables.
//
// A per-route template overrides this by writing its own `panel(...)` calls; it exists so that a
// template that only wants different CHROME does not have to restate panel body logic it has no
// opinion about.
#let panel-body(report, p) = {
  if "unavailable" in p and p.unavailable != none {
    panel-unavailable(p)
  } else {
    if "chart" in p and p.chart != none { panel-chart(p) }
    if "stats" in p and p.stats != none { stat-grid(p.stats) }
    if report.includeTables and "table" in p and p.table != none {
      if "chart" in p and p.chart != none { v(6pt) }
      table-from-rows(report, p.table)
    }
  }
}

// Every panel, in `dashboards.yaml` order.
#let panels-in-order(report) = {
  for p in report.panels {
    panel(p, panel-body(report, p))
  }
}
