import type { ReportDocument } from './report-data';
import type { RenderAsset } from './typst-client';

/**
 * `format=html` — a preview of the same report, opened in a new tab, with **no Typst involved**
 * (converse-frontends#453).
 *
 * It exists for one reason the story states outright: without the sidecar running, "the console's
 * export route can still serve `format=html` and `format=csv`". A developer editing a panel or a
 * template layout can see the assembled document — the same `ReportDocument`, the same panel
 * order, the same figures, the same charts — without a container.
 *
 * It is a PREVIEW, not a second report format, and the difference matters: this deliberately does
 * NOT reimplement the `.typ` template's chrome. It renders the DATA a template receives, in
 * document order, so what a reader is checking is "did the pipeline assemble the right report",
 * not "does this look like the PDF". The PDF's own look belongs to the template, and having two
 * implementations of it would guarantee they disagree.
 *
 * Charts are inlined verbatim: they are already standalone SVG with print literals substituted
 * (`panel-svg.ts`), so the preview shows exactly the picture the PDF embeds — including a colour
 * mistake, which is the point.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Every string that reaches this document comes from a usage response — model names, user ids,
 *  account labels — so it is attacker-influenced text and is escaped without exception. The SVGs
 *  are not: they are markup this process generated itself, from `renderToStaticMarkup`, which
 *  escapes its own text nodes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

function renderTable(columns: string[], rows: string[][]): string {
  return [
    '<table>',
    `<thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>`,
    '<tbody>',
    ...rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`),
    '</tbody>',
    '</table>',
  ].join('');
}

const DATA_URI_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * The branding logo as a `data:` URI.
 *
 * The preview is a single self-contained file with no server behind it, so the logo has to travel
 * inside it — the same bytes the PDF embeds, encoded rather than fetched. Absent asset, absent
 * logo: the header then reads exactly as it did before branding existed.
 */
function logoDataUri(assets: Record<string, RenderAsset>, path: string): string | undefined {
  const asset = assets[path];
  if (asset === undefined) return undefined;
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  const type = DATA_URI_TYPES[extension];
  if (!type) return undefined;
  const base64 = (
    typeof asset === 'string' ? Buffer.from(asset, 'utf8') : Buffer.from(asset)
  ).toString('base64');
  return `data:${type};base64,${base64}`;
}

export function reportHtml(document: ReportDocument, assets: Record<string, RenderAsset>): string {
  const sections = document.panels.map((panel) => {
    const parts: string[] = [
      `<h2>${escapeHtml(panel.title)}</h2>`,
      panel.subtitle ? `<p class="sub">${escapeHtml(panel.subtitle)}</p>` : '',
    ];

    if (panel.unavailable) {
      parts.push(`<p class="unavailable">${escapeHtml(panel.unavailable)}</p>`);
      return `<section>${parts.join('')}</section>`;
    }

    // Only a TEXT asset is inlined as markup. Every chart is one (`renderPanelSvg` returns SVG
    // source); a binary asset reaching this branch would be a bug, and pasting its bytes into the
    // document is not the way to find out about it.
    const chart = panel.chart ? assets[panel.chart] : undefined;
    if (typeof chart === 'string') {
      parts.push(`<div class="chart">${chart}</div>`);
    }
    if (panel.caption) parts.push(`<p class="caption">${escapeHtml(panel.caption)}</p>`);
    if (panel.stats) {
      parts.push(
        renderTable(
          ['Label', 'Value', 'Change'],
          panel.stats.map((stat) => [stat.label, stat.value, stat.delta ?? '—'])
        )
      );
    }
    if (panel.table && document.includeTables) {
      parts.push(renderTable(panel.table.columns, panel.table.rows));
    }
    return `<section>${parts.join('')}</section>`;
  });

  const filters = document.filters
    .map((filter) => `${escapeHtml(filter.label)}: ${escapeHtml(filter.value)}`)
    .join(' · ');

  const logo = document.branding?.logo ? logoDataUri(assets, document.branding.logo) : undefined;
  const brandName = document.branding?.name;
  const brand = logo
    ? `<img class="logo" src="${logo}" alt="${escapeHtml(brandName ?? 'Brand logo')}">`
    : brandName
      ? `<p class="brand">${escapeHtml(brandName)}</p>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(document.title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0 auto; max-width: 62rem; padding: 2.5rem 1.5rem 4rem; background: #fff;
         color: #1a1a1a; font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
  header { border-bottom: 1px solid #cfcfcf; padding-bottom: 1rem; margin-bottom: 2rem; }
  h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
  /* The same ~28pt cap the .typ header uses, so the preview and the PDF agree on the mark's
     weight in the page rather than each picking its own. */
  .logo { display: block; height: 37px; width: auto; margin: 0 0 .75rem; }
  .brand { font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
           color: #6b6b6b; margin: 0 0 .5rem; }
  .meta, .sub, .caption { color: #6b6b6b; font-size: 12px; margin: .25rem 0; }
  section { border-top: 1px solid #dedede; padding-top: 1.25rem; margin-top: 1.75rem; }
  h2 { font-size: 1rem; margin: 0 0 .25rem; }
  .chart { margin: .75rem 0; overflow-x: auto; }
  .unavailable { color: #b4441c; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; margin: .75rem 0; font-size: 12px; }
  th, td { border-bottom: 1px solid #dedede; padding: .35rem .5rem; text-align: left; }
  td + td, th + th { text-align: right; }
  footer { color: #6b6b6b; font-size: 11px; margin-top: 3rem; }
</style>
</head>
<body>
<header>
  ${brand}
  <h1>${escapeHtml(document.title)}</h1>
  <p class="meta">${escapeHtml(document.rangeLabel)} · ${escapeHtml(document.window.start)} – ${escapeHtml(document.window.end)} · UTC</p>
  ${filters ? `<p class="meta">${filters}</p>` : ''}
  <p class="meta">Generated ${escapeHtml(document.generatedAt)}</p>
</header>
${sections.join('\n')}
<footer>
  ${escapeHtml(document.route)} · template ${escapeHtml(document.template.origin)} ·
  HTML preview — the PDF's own chrome comes from this route's <code>.typ</code> template.
</footer>
</body>
</html>`;
}
