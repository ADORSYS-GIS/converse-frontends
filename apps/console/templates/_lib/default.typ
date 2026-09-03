// The GENERIC report (converse-frontends#453) — the last rung of the template lookup order.
//
// A route with no template of its own renders through this one, so a page added to
// `dashboards.yaml` is exportable the day it is added: a missing per-route template is a styling
// gap, never an error. It iterates `report.panels` in document order and asks the library for each
// panel's default body, which is exactly what most reports want.
//
// Copy this file to `templates/<route>/report.typ` (in the repo) or to
// `${CONSOLE_TEMPLATES_DIR}/<route>/report.typ` (a deployment override) and edit it to give one
// route different chrome.

#import "_lib/report.typ": *

#let report = json(sys.inputs.at("data"))

#show: report-page.with(report)

#panels-in-order(report)
