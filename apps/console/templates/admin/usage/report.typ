// `/admin/usage` — the estate usage report.
//
// Chrome only. The one thing it adds over the generic template is a LEAD BLOCK of the page's stat
// panels before the charts: a usage report is read totals-first, and `dashboards.yaml` orders
// panels for a grid, where the stats already sit along the top row. Ordering is chrome, so it
// belongs here; which stats exist is not, so it is not.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#let stat-panels = report.panels.filter(p => p.type == "stat" or p.type == "stat-group")
#let rest = report.panels.filter(p => p.type != "stat" and p.type != "stat-group")

#for p in stat-panels {
  panel(p, panel-body(report, p))
}

#if stat-panels.len() > 0 and rest.len() > 0 {
  line(length: 100%, stroke: 0.4pt + hairline)
  v(8pt)
}

#for p in rest {
  panel(p, panel-body(report, p))
}
