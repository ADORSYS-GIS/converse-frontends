import type { ReactNode } from 'react';

export interface AuthPanelShellProps {
  /** Product wordmark in the top-left. Sentence/brand case, sans (console-ui "Type"). */
  wordmark?: string;
  /** The page's own heading — one per page, sentence case. */
  title: string;
  /** One line of prose under the heading. Optional: `/device/success` needs no lead. */
  lead?: ReactNode;
  /** The panel body — a form, a confirmation, an error statement. */
  children: ReactNode;
  className?: string;
}
