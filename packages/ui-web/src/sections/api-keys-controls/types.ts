import type { SegmentedOption } from '../../components/segmented-control';

/**
 * The API-keys screen's FILTERS — status and search, and nothing else.
 *
 * The project select left this cluster on 2026-09-03 (ADR 0015 amendment A2): it is SCOPE, not a
 * filter — which project's keys these are, rather than which of them are shown — so it is its own
 * `PageControls` group, parted from these two by a hairline, and `Reset filters` deliberately does
 * not touch it. (Account is not here either: it is identity, and lives in the sidebar's workspace
 * switcher. See `AccountBadge`.) Neither is a precondition for creating a key — live findings #4,
 * 2026-08-30: `CreateApiKeyDialog` asks for the target project itself, so `+ New key` stays enabled
 * at "All projects".
 */
export interface ApiKeysControlsProps {
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}
