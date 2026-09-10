// `/accounts/[accountId]/overview` — one account's own overview report.
//
// Chrome only. This is the report an account member hands to someone outside the console, so it
// leads with the account it is about and says the window is UTC — the two things a recipient with
// no console access cannot look up for themselves.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#block(inset: (bottom: 8pt))[
  #text(size: 8pt, fill: subtle)[
    Scoped to one account. Every window boundary on this page is UTC, which is also the boundary
    the budget period itself resets on.
  ]
]

#panels-in-order(report)
