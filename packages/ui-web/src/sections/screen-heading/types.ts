import type { ReactNode } from 'react';

export interface ScreenHeadingProps {
  /** `page-title` role — 22px mono `ink` (console-ui skill "Type"). */
  title: string;
  /** `prose` role — 11px Inter `subtle`, e.g. `"adorsys-gis · last 30 days · UTC"`. */
  subline?: ReactNode;
  /**
   * Inline slot immediately after the subline — where a compact-tier `SectionSheetTrigger` for
   * scope-like context sits (Api-Keys' SCOPE trigger in api-keys.svg).
   */
  sublineActions?: ReactNode;
  /** Right-hand slot on the title row — a screen's primary action (`+ New key`). */
  actions?: ReactNode;
  className?: string;
}
