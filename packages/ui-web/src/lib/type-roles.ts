// The console's type roles — one definition per role, consumed everywhere it is rendered.
//
// Revamp phase 1 (console visual revamp brief, 2026-08 — supersedes this file's earlier
// mono-everything scale): Inter (`font-sans`) is the UI type — titles, subtitles, section
// headings, labels, body copy, meta lines, error text. IBM Plex Mono (`font-mono`) is reserved
// for DATA ONLY — currency, counts, percentages, ids/UUIDs, key prefixes, ISO dates/timestamps,
// kbd — never for prose or structural chrome. Every data role also carries `data-numeral`
// (`theme.css`) for tabular figures.

/** Page-level heading — the title a screen opens with (`PageHeader`). */
export const PAGE_TITLE_CLASS = 'font-sans text-[24px] font-semibold leading-[1.2] text-ink';

/** The sentence under a page title — context, not a heading of its own. */
export const PAGE_SUBTITLE_CLASS = 'font-sans text-[13px] leading-[1.5] text-subtle';

/** A zone/card heading one step below the page title — `Card`'s own title, a dashboard zone. */
export const SECTION_TITLE_CLASS = 'font-sans text-[15px] font-medium text-ink';

/** Structural label: form-control labels, table column headers, rail section headings. */
export const LABEL_CLASS = 'font-sans text-[12px] text-subtle';

/** Sentence-copy body text — the console's one prose role. */
export const BODY_CLASS = 'font-sans text-[13px] leading-[1.5] text-soft';

/** A secondary line under a control or beside a row — captions, non-load-bearing metadata. */
export const META_CLASS = 'font-sans text-[12px] leading-[1.45] text-subtle';

/** An error line's own text — signal-coloured, never decorative. */
export const ERROR_TEXT_CLASS = 'font-sans text-[13px] text-primary';

/** A data value at body weight — table cells, list rows: counts, ids, dates, currency. */
export const DATA_CLASS = 'font-mono data-numeral text-[13px] text-soft';

/** The same data role at full strength — the value IS the thing, not a fact about it. */
export const DATA_INK_CLASS = 'font-mono data-numeral text-[13px] text-ink';

/** A key numeral inside a stat card or table footer. */
export const METRIC_CLASS = 'font-mono data-numeral text-[28px] leading-[1.15] text-ink';

/** `METRIC_CLASS` at the hero step — one per screen, the number the page is about. */
export const HERO_METRIC_CLASS = 'font-mono data-numeral text-[34px] leading-[1.1] text-ink';

/** The reference value beside a hero metric ("of $2,000.00") — never in the numeral's `ink`. */
export const HERO_CEILING_CLASS = 'font-sans text-[13px] text-subtle';

/** A settings-row's own label — one step stronger than `LABEL_CLASS`, since it stands alone as
 *  the row's name rather than captioning a control beside it (`components/settings-row`). */
export const ROW_LABEL_CLASS = 'font-sans text-[13px] text-ink';
