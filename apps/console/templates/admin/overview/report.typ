// `/admin/overview` — the operator dashboard's report.
//
// Chrome only (converse-frontends#453): which panels exist and what they queried is
// `dashboards.yaml`'s, not this file's. What this file adds over `_lib/default.typ` is the one
// thing an estate-wide report has to say out loud — that "all accounts" means all accounts WITH
// USAGE in the window, which is a structural property of a usage-events query, not a census.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#block(inset: (bottom: 8pt))[
  #text(size: 8pt, fill: subtle)[
    Estate-wide. Every figure covers accounts with usage in this window — an account with no
    usage never appears in a usage query at all, so this is not a census of accounts.
  ]
]

#panels-in-order(report)
