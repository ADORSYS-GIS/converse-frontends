// `/admin/usage/models/[model]` — one model's usage report.
//
// Chrome only. A model is not a usage scope the backend knows, so the report says plainly what the
// figures below are actually narrowed by: an ESTATE query with one equality filter on it. A reader
// comparing this PDF against an account's own report needs that sentence to know why the totals do
// not add up the way they might expect.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#block(inset: (bottom: 8pt))[
  #text(size: 8pt, fill: subtle)[
    Scoped to one model, across every account on the deployment — the `model` string the gateway
    recorded on each request, verbatim. Requests whose model the gateway did not record appear as
    "Unassigned" in the estate report, never here.
  ]
]

#panels-in-order(report)
