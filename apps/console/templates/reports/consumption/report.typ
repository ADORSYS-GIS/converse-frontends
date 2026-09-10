// `/api/reports/consumption?format=pdf` — the monthly consumption report.
//
// Migrated onto the Typst pipeline by converse-frontends#453, replacing the hand-rolled PDF 1.4
// writer that could not draw an image at any price. Same figures, same shared `formatUsd`, same
// project × model grouping and TOTAL row — the CSV path is untouched and byte-identical.
//
// Not a dashboard page and not in `dashboards.yaml`: this report has no page of its own. It still
// follows the path-mirrors-template rule, so an operator overrides it at
// `${CONSOLE_TEMPLATES_DIR}/reports/consumption/report.typ`.
//
// It is greyscale by intent, like the writer it replaces: this is a document that gets printed and
// sent to whoever pays the bill, and the console's `--signal` accent has no job in it.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#block(inset: (bottom: 8pt))[
  #text(size: 8pt, fill: subtle)[
    Grouped by project × model for the calendar month, summed across every time bucket the usage
    backend returned. Rows the backend attributed to no project or model are named
    "(unattributed)" rather than dropped.
  ]
]

#panels-in-order(report)
