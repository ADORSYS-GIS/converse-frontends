import React from 'react';

import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import type { ApiKeysControlsProps } from './types';

// The API-keys screen's FILTERS — status and search. (Project is SCOPE, a `PageControls` group of
// its own — see `ApiKeysControlsProps`.)
//
// 2026-09-03 (owner directive "filters are outside cards", ADR 0015 amendment A2): a FRAGMENT, not
// a `<section>` with its own flex row. The row is `PageControls`, on the floor between `PageHeader`
// and the ledger's `Card`; a caller drops this cluster into one `PageControlsGroup` and the row
// owns the geometry and the group's accessible name. See `OverviewControls` for the same note.
//
// `+ New key` is not here at all — it is `PageHeader.action`, the screen's one primary action, not
// one filter among several. Account is not here either: it is identity, and lives in the sidebar's
// workspace switcher.
//
// Where the old right-rail sections went: KEY HYGIENE -> `ApiKeysHygieneNotes`, inline above the
// table; LIFECYCLE -> deleted, since `TypedConfirmDialog` carries that copy at the moment it
// matters.
export function ApiKeysControls({
  statusOptions,
  statusValue,
  onStatusChange,
  search,
  onSearchChange,
}: ApiKeysControlsProps) {
  // Phase 9 — no external "Status"/"Search" labels: the segmented control's cells already read
  // `Active`/`Revoked`/…, and the search field's placeholder says what it searches. Every
  // `label`/`aria-label` stays for a11y (`hideLabel` only hides the visible text).
  return (
    <>
      <SegmentedControl
        aria-label="Status filter"
        options={statusOptions}
        value={statusValue}
        onChange={onStatusChange}
      />

      <Field
        label="Search"
        layout="inline"
        hideLabel
        placeholder="name or prefix…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </>
  );
}
