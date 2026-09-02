'use client';

import React, { useState } from 'react';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import type { ReportExportFormat } from '@lightbridge/ui-web/src/components/report-export-panel';

import { useDashboardExportParams } from '../client/url-state';
import type { UsageWindow } from '../containers/comparison-window';
import { downloadBlob, filenameFromContentDisposition } from '../containers/download-file';
import {
  dashboardExportUrl,
  exportRangeEcho,
  type DashboardExportFormat,
} from './dashboard-export';

/**
 * The Export affordance every `dashboards.yaml`-driven page carries in its `PageHeader`
 * (converse-frontends#453).
 *
 * It is deliberately ONE component rather than a per-page control, and it takes the page's own
 * identity — route, window, filters — rather than a pre-built URL: that is what makes "every YAML
 * page is exportable" a property of the engine instead of something each page has to remember. A
 * page added to the YAML gets the button by composing `DashboardPageShell`, and gets it correct,
 * because the same values that drove its queries drive its export.
 *
 * The dialog is the EXISTING `ReportExportDialog`, extended rather than forked (#453 asks for
 * exactly that). Three of its controls are absent, not disabled: the period picker (this window is
 * the page's own range picker, echoed read-only), the scope select (the scope IS the route) and
 * group-by (each panel's grouping is the YAML's). What remains is the format and the one thing a
 * reader genuinely varies — whether the tables ride along with the charts.
 *
 * States follow `docs/design/console-redesign/README.md` §8.3:
 *
 * ```mermaid
 * stateDiagram-v2
 *     [*] --> Idle
 *     Idle --> Idle: format / include-tables edited
 *     Idle --> Generating: Generate report
 *     Generating --> Downloaded: file delivered
 *     Generating --> Failed: route or renderer error
 *     Downloaded --> Idle: dialog closes, re-armed
 *     Failed --> Generating: Retry (same request)
 *     Failed --> Idle: parameters edited
 * ```
 *
 * There is no `EmptyResult` state here, unlike the consumption report's. A dashboard report of an
 * empty window is a real document: every panel states its own emptiness, the header states the
 * window, and that is a more useful answer to "what happened last week" than a refusal to produce
 * a file.
 */

export interface DashboardExportButtonProps {
  /** The `dashboards.yaml` key this page renders — `[param]` segments literal. */
  route: string;
  /** The page's title, for the dialog's own heading. */
  title: string;
  /** The range preset in the URL, and its wording. */
  range: string;
  rangeLabel: string;
  window: UsageWindow;
  from?: string;
  to?: string;
  /** The page's declared filter values. */
  filters?: Record<string, string | undefined>;
}

export function DashboardExportButton({
  route,
  title,
  range,
  rangeLabel,
  window: usageWindow,
  from,
  to,
  filters,
}: DashboardExportButtonProps) {
  // The dialog and its two knobs are real view state (ADR 0011): Back closes the dialog, and
  // `format`/`tables` decide WHICH DOCUMENT Generate produces — the route reads the same two names,
  // which is what makes an exported report reproducible from a pasted URL.
  const [view, setView] = useDashboardExportParams();

  // SANCTIONED LOCAL STATE (ADR 0011 Decision 3): in-flight request status, the same shape
  // `containers/auth-view.tsx`'s pre-redirect status has. Neither is "what am I looking at": a
  // download that is halfway through, and the error it just produced, are facts about THIS tab's
  // last press. Putting either in the URL would mean a shared link opened a dialog already showing
  // a stranger's failure, and a reload would resurrect a "Generating…" that is not generating.
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const format = view.format as ReportExportFormat;
  const includeTables = view.tables;

  async function generate(chosen: DashboardExportFormat) {
    setGenerating(true);
    setError(null);
    try {
      const url = dashboardExportUrl({
        route,
        range,
        from,
        to,
        filters,
        format: chosen,
        includeTables,
      });
      const response = await fetch(url);
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          body &&
          typeof body === 'object' &&
          typeof (body as { message?: unknown }).message === 'string'
            ? (body as { message: string }).message
            : 'Could not generate the report. Try again.';
        // The renderer's own compile-error detail (Typst's stderr, line and column) is carried on
        // `detail`. It goes to the console, not into the dialog: it is a template author's
        // diagnostic, and a reader who pressed Export cannot act on a line number.
        const detail =
          body &&
          typeof body === 'object' &&
          typeof (body as { detail?: unknown }).detail === 'string'
            ? (body as { detail: string }).detail
            : null;
        if (detail) console.error('[console] Report render failed:', detail);
        throw new Error(message);
      }

      const blob = await response.blob();
      const filename =
        filenameFromContentDisposition(response.headers.get('content-disposition')) ??
        `report.${chosen}`;
      downloadBlob(blob, filename);
      void setView({ open: false });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => void setView({ open: true })}>
        Export
      </Button>
      <ReportExportDialog
        open={view.open}
        onOpenChange={(next) => {
          void setView({ open: next });
          // Re-armed on close, per §8.3: a stale failure must not greet the next reader who opens
          // the dialog for a window that may since have changed.
          if (!next) setError(null);
        }}
        title={`Export · ${title}`}
        rangeEcho={exportRangeEcho(rangeLabel, usageWindow)}
        includeToggles={[{ id: 'tables', label: 'Include tables', checked: includeTables }]}
        onToggleInclude={(_id, checked) => void setView({ tables: checked })}
        format={format}
        onFormatChange={(next) => void setView({ format: next })}
        generating={generating}
        error={error ? { message: error, onRetry: () => void generate(format) } : undefined}
        onGenerate={(params) => void generate(params.format)}
      />
    </>
  );
}
