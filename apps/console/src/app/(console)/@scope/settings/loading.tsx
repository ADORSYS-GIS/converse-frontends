'use client';

import { RailTextSkeleton } from '../../../../containers/rail-skeleton';

/**
 * `/settings` left-rail secondary loading skeleton (`@scope` slot) — `SettingsSubNav`'s "Projects"
 * row carries a live project count (`useSettingsScreen()`), unavailable to this static file, so
 * both rows render as text-line skeletons under the same SETTINGS heading.
 */
export default function SettingsScopeLoading() {
  return <RailTextSkeleton label="SETTINGS" lineCount={2} />;
}
