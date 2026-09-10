// `/admin/usage/channels/[channelId]` — one client/channel's usage report.
//
// Chrome only. A channel is the `azp` an access token was minted for, so the report names that
// plainly: a reader who does not know what "channel" means in this console gets one sentence that
// tells them, rather than a title they have to ask about.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#block(inset: (bottom: 8pt))[
  #text(size: 8pt, fill: subtle)[
    Scoped to one channel — the OAuth client (`azp`) a request's token was minted for. Requests
    whose channel the gateway did not record appear as "Unassigned" in the estate report, never
    here.
  ]
]

#panels-in-order(report)
