/**
 * One embedded Grafana panel, rendered chromeless (`d-solo` + `kiosk`) — no page chrome, just the
 * panel itself, sized to sit inside a `Card`. A plain `<iframe>` needs no client-side JS, so this
 * renders straight from a Server Component.
 */
export function GrafanaPanel({
  baseUrl,
  dashboardUid,
  dashboardSlug,
  panelId,
  title,
  vars,
  range,
  minHeight = 200,
}: {
  baseUrl: string;
  dashboardUid: string;
  dashboardSlug: string;
  panelId: number;
  title: string;
  vars: Record<string, string>;
  range?: { from: string; to: string };
  minHeight?: number;
}) {
  const params = new URLSearchParams({ orgId: '1', panelId: String(panelId), theme: 'dark' });
  for (const [key, value] of Object.entries(vars)) params.set(`var-${key}`, value);
  if (range) {
    params.set('from', range.from);
    params.set('to', range.to);
  }

  const src = `${baseUrl.replace(/\/+$/, '')}/d-solo/${dashboardUid}/${dashboardSlug}?${params.toString()}&kiosk`;

  return (
    <iframe
      src={src}
      title={title}
      className="border-border bg-surface w-full rounded-lg border"
      style={{ minHeight }}
    />
  );
}
