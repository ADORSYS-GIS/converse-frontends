// `/admin/usage/actors/[actorId]` — one actor's usage report.
//
// The directory name is `[actorId]`, LITERALLY, because the template path mirrors the route path
// (converse-frontends#453). The value is in `report.filters`, resolved by the route before this
// file ever runs; nothing here parses a path.
//
// Chrome only: this report is about ONE actor, so it says whose it is under the title rather than
// leaving the reader to infer it from a file name that a forwarded PDF may not keep.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#block(inset: (bottom: 8pt))[
  #text(size: 8pt, fill: subtle)[
    Scoped to a single actor. Figures cover only this actor's own usage in the window; an actor's
    spend attributed to nothing appears in the estate report as "Unassigned", never here.
  ]
]

#panels-in-order(report)
