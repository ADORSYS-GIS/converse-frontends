import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** `page-title` role — the title a screen opens with. */
  title: string;
  /** `page-subtitle` role — context under the title. */
  subtitle?: string;
  /**
   * The screen's primary action (e.g. `+ New key`, Export) — the emphasised, right-most control on
   * the title row.
   *
   * There is no `controls` slot any more (owner directive 2026-09-03, ADR 0015 amendment A2). Every
   * screen PARAMETER — range, lens, status, search, page size, reset — is a group in
   * `PageControls`, the full-width row below this one. The title row is a title and one action; a
   * range picker sharing that trailing edge with a primary button is what made both hard to find
   * below `xl`.
   */
  action?: ReactNode;
}
