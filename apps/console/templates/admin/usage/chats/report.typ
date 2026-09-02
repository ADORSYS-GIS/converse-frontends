// `/admin/usage/chats` — the chat-shaped-operations report.
//
// Chrome only. Its one addition is the sentence a latency report cannot honestly omit: the
// percentiles here are per-BUCKET readings the backend computed at query time, and the worst
// bucket is stated rather than an average of percentiles — which is not a percentile of anything.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#block(inset: (bottom: 8pt))[
  #text(size: 8pt, fill: subtle)[
    Latency figures are per-bucket percentiles computed by the usage backend at query time. Where
    a single number is stated for the window it is the WORST bucket's, never an average of
    percentiles.
  ]
]

#panels-in-order(report)
