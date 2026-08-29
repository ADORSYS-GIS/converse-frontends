// Duration formatting — the millisecond sibling of `./money.ts`. Deliberately its own file, not
// a case folded into `formatUsd`: money and duration are different units with different reading
// conventions (a duration's "significant precision" band sits at completely different magnitudes
// than a currency amount's, and a duration additionally rolls over into a minutes:seconds shape
// past 60s that money has no equivalent of), and this codebase's own convention (`money.ts`'s own
// header) is one formatter per unit, never a shared "numeric" formatter reused across units.
//
// ---------------------------------------------------------------------------------------------
// THE PRECISION LADDER, AND WHY
// ---------------------------------------------------------------------------------------------
// Latency is read at wildly different magnitudes depending on what it is measuring: a cache-hit
// lookup differs from a cache miss by single-digit milliseconds; a real LLM completion request
// runs from a few hundred ms into multiple seconds; a long batch/eval job can run for minutes.
// One fixed decimal count is wrong at every one of those scales at once (2dp makes a 4.20ms cache
// check look falsely precise while a 1240.00ms completion drowns in trailing zeros), so — same
// shape as `money.ts`'s ladder — the DECIMAL COUNT adapts to the magnitude; the unit itself stays
// milliseconds until 1000ms, then becomes seconds, then (past 60s) minutes:seconds.
//
// The bands, and why each boundary sits where it does:
//
//     < 1 ms      -> '<1 ms'      Below the resolution the measurement actually has. The usage
//                                  backend computes `percentile_cont` over per-request durations,
//                                  and in this deployment those come from Envoy's `%DURATION%`
//                                  access-log field, which is an INTEGER count of milliseconds --
//                                  so the dominant production source cannot express a
//                                  sub-millisecond value at all, and one arriving here means an
//                                  interpolated percentile between two adjacent integers, or the
//                                  seconds-valued OpenTelemetry semconv path. Either way a
//                                  fractional figure below 1ms asserts precision the underlying
//                                  measurement never had. Named, not rounded to a fake `0.4 ms`
//                                  or a misleading `0 ms` (the same "never fabricate a zero" rule
//                                  `money.ts`'s `USD_DISPLAY_FLOOR` follows for a sub-cent
//                                  amount).
//     [1, 10) ms  -> one decimal  A single-digit-ms difference is real signal at this scale (a
//                                  cache hit vs. a cache miss can be exactly this size), so the
//                                  extra digit earns its place: `4.2 ms`, not the coarser `4 ms`.
//     [10, 1000) ms -> integer ms Sub-millisecond precision here is noise: ordinary network
//                                  jitter alone exceeds 1ms at this scale, so a decimal digit
//                                  would assert stability the measurement doesn't have: `412 ms`.
//     >= 1000 ms  -> seconds      A human reads "1240 ms" more slowly than "1.24 s" -- past one
//                                  full second, seconds are the natural unit. Adaptive precision
//                                  within the seconds band mirrors `money.ts`'s "least decimals
//                                  that still assert something": two decimals under 10s (a real
//                                  request timing distinction still lives in the hundredths
//                                  there), one decimal under 60s (a tenth of a second is as fine
//                                  as anyone reads a multi-second wait), and past 60s a switch to
//                                  `m s` -- decimal seconds stop being legible once there is more
//                                  than a minute of them ("87.3 s" reads far slower than
//                                  "1 m 27 s" for the same duration).
//
// Non-finite input (`NaN`/`±Infinity`) and negative input both render as an em dash (`—`), never
// a fabricated `0`. A negative duration is not "a very fast request" -- there is no such thing as
// negative elapsed time, so a negative value here means the clock feeding this formatter is
// broken (a bad subtraction, a clock skew), and the honest response is to say so by refusing to
// state a number at all, the same posture `money.ts` takes for an amount below its display floor
// rather than rounding it away.

const THIN_SPACE = ' ';
const BROKEN_VALUE = '—';

/** `1131` -> `1 131` -- the console's thin-space thousands grouping (`money.ts`'s own
 *  `groupThousands`), reused here rather than re-exported: a minute count large enough to need
 *  grouping (18+ hours of "duration") is not a case either formatter expects often, but the same
 *  convention applies the moment it happens. */
function groupThousands(integerPart: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

/** Formats the `>= 1000 ms` band: seconds, with adaptive precision, rolling over into `m s` past
 *  a minute. `ms` is already known finite and non-negative by the time this runs. */
function formatSeconds(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    const decimals = totalSeconds < 10 ? 2 : 1;
    return `${totalSeconds.toFixed(decimals)} s`;
  }

  const wholeSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;
  return `${groupThousands(String(minutes))} m ${String(seconds).padStart(2, '0')} s`;
}

/**
 * The stated duration -- a tooltip value, a ledger cell, a peak-value caption. Adaptive precision
 * per the ladder documented at the top of this file: `<1 ms`, `4.2 ms`, `412 ms`, `1.24 s`,
 * `12.4 s`, `1 m 03 s`.
 *
 * Use this everywhere a duration is being ASSERTED. The only exception is a chart's axis, where
 * the label marks a gridline rather than states a value -- see `formatMsAxis`.
 */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return BROKEN_VALUE;
  if (ms < 1) return '<1 ms';
  if (ms < 10) return `${ms.toFixed(1)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return formatSeconds(ms);
}

/** The mantissa of an abbreviated axis tick: at most one decimal, no pad zero (`1`, `1.5`, `30`) --
 *  one decimal is enough resolution for a gridline label, where `formatMs` needs two near the
 *  10s boundary because it is asserting a real value, not marking a scale. */
function abbreviateSeconds(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

/**
 * A chart AXIS TICK -- a different job from `formatMs`, matching `formatUsdAxis`'s own split from
 * `formatUsd`: the label identifies a gridline on a scale, not an asserted measurement, so it
 * drops the unit space and the sub-second decimal precision `formatMs` needs (`250ms`, `1s`,
 * `1.5s`, `30s`) rather than spending axis width on either. Seconds abbreviate past 1000ms, same
 * threshold `formatMs` switches units at, so the two stay legible side by side on the same chart.
 */
export function formatMsAxis(ms: number): string {
  if (!Number.isFinite(ms)) return '0';
  const sign = ms < 0 ? '-' : '';
  const magnitude = Math.abs(ms);

  if (magnitude === 0) return '0';
  if (magnitude >= 1000) return `${sign}${abbreviateSeconds(magnitude / 1000)}s`;
  return `${sign}${Math.round(magnitude)}ms`;
}
