import { describe, expect, it } from 'vitest';

import { filenameFromContentDisposition } from './download-file';

describe('filenameFromContentDisposition', () => {
  it('reads a quoted filename', () => {
    expect(filenameFromContentDisposition('attachment; filename="consumption-2026-02.csv"')).toBe(
      'consumption-2026-02.csv'
    );
  });

  it('reads an unquoted filename', () => {
    expect(filenameFromContentDisposition('attachment; filename=consumption-2026-02.csv')).toBe(
      'consumption-2026-02.csv'
    );
  });

  it('returns null when the header is absent', () => {
    expect(filenameFromContentDisposition(null)).toBeNull();
  });

  it('returns null when the header carries no filename', () => {
    expect(filenameFromContentDisposition('attachment')).toBeNull();
  });
});
