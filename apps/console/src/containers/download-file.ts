/**
 * Triggers a real browser download of an already-fetched `Blob` — the client half of ticket #309
 * (the route itself, `/api/reports/consumption`, is #308). `downloadBlob` is a thin, standard
 * object-URL + programmatic-anchor-click wrapper; `filenameFromContentDisposition` is the pure
 * part, unit tested on its own.
 */

const CONTENT_DISPOSITION_FILENAME = /filename="?([^";]+)"?/i;

/** Reads the filename off a `Content-Disposition: attachment; filename="…"` header, or `null` when
 *  the header is absent or carries no filename — the caller falls back to a name it derives itself. */
export function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = CONTENT_DISPOSITION_FILENAME.exec(header);
  return match ? match[1] : null;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
