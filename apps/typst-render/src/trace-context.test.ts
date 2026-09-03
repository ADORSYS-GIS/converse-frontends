import { describe, expect, it } from 'vitest';

import { parseTraceparent, traceLogSuffix } from './trace-context.js';

const VALID = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

describe('parseTraceparent', () => {
  it('reads the trace id, parent span id and sampled flag', () => {
    expect(parseTraceparent(VALID)).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      parentId: '00f067aa0ba902b7',
      sampled: true,
    });
  });

  it('reports an unsampled parent as such rather than dropping it', () => {
    expect(parseTraceparent(VALID.replace(/-01$/, '-00'))?.sampled).toBe(false);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseTraceparent(`  ${VALID}  `)?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('accepts a future version it does not know, per the spec forward-compat rule', () => {
    expect(parseTraceparent(VALID.replace(/^00/, '01'))?.traceId).toBe(
      '4bf92f3577b34da6a3ce929d0e0e4736'
    );
  });

  it.each([
    ['absent', undefined],
    ['a repeated header, which Node surfaces as an array', ['a', 'b']],
    ['empty', ''],
    ['the invalid ff version', VALID.replace(/^00/, 'ff')],
    ['an all-zero trace id', `00-${'0'.repeat(32)}-00f067aa0ba902b7-01`],
    ['an all-zero span id', `00-4bf92f3577b34da6a3ce929d0e0e4736-${'0'.repeat(16)}-01`],
    ['too short a trace id', '00-4bf92f3577b34da6-00f067aa0ba902b7-01'],
    ['non-hex characters', '00-zzf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'],
    ['trailing junk', `${VALID}-extra`],
    // A header value is attacker-reachable input that ends up in a log line; anything that could
    // forge a second line must fail the pattern outright, not be sanitised afterwards.
    ['an embedded newline', `${VALID}\n[typst-render] forged`],
  ])('returns undefined for %s', (_label, header) => {
    expect(parseTraceparent(header as string | string[] | undefined)).toBeUndefined();
  });
});

describe('traceLogSuffix', () => {
  it('renders nothing at all when there is no context to report', () => {
    expect(traceLogSuffix(undefined)).toBe('');
  });

  it('appends the ids in a shape an operator can grep for', () => {
    expect(traceLogSuffix(parseTraceparent(VALID))).toBe(
      ' trace=4bf92f3577b34da6a3ce929d0e0e4736 span=00f067aa0ba902b7'
    );
  });
});
