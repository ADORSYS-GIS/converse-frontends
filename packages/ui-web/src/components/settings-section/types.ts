import type { ReactNode } from 'react';

export type SettingsSectionProps = {
  /** Uppercase section heading, e.g. "REVIEW BEHAVIOUR". */
  title: string;
  children: ReactNode;
  className?: string;
};

export type SettingsRowProps = {
  label: string;
  description?: ReactNode;
  /** The row's control (a `Toggle`, `Field`, etc.). Falls back to `children` if omitted. */
  control?: ReactNode;
  /**
   * Optional trailing indicator before the control — e.g. a `StatusText` provenance tag
   * ("Admin override"). A generic layout slot, not settings-specific.
   */
  badge?: ReactNode;
  children?: ReactNode;
};
