import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** `page-title` role — the title a screen opens with. */
  title: string;
  /** `page-subtitle` role — context under the title. */
  subtitle?: string;
  /** Filters/scope pickers etc. — rendered before `action` in the trailing controls cluster. */
  controls?: ReactNode;
  /** The screen's primary action (e.g. `+ New key`) — rendered last, so it reads as the
   *  emphasised, right-most control. */
  action?: ReactNode;
}
