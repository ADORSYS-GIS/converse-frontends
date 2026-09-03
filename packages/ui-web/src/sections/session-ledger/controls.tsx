import React from 'react';

import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import type { SelectFieldOption } from '../../components/select-field';

/** The three-way status filter, as the URL vocabulary spells it. `inactive` is not a backend
 *  status — it is `revoked` + `expired`, which `querySessions` can only answer as TWO calls
 *  (its `status` filter is a single value), merged by the container. */
export type SessionStatusFilter = 'active' | 'inactive' | 'all';
export type SessionKindFilter = 'all' | 'browser' | 'token';

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
  { value: 'all' as const, label: 'All' },
];

const KIND_OPTIONS = [
  { value: 'all' as const, label: 'All kinds' },
  { value: 'browser' as const, label: 'Browser' },
  { value: 'token' as const, label: 'Token' },
];

/**
 * The page sizes offered, as `SelectField` options.
 *
 * The values are the caller's business — `apps/console` owns the URL contract
 * (`SESSION_PAGE_SIZES` in `client/url-state.ts`, capped at `querySessions`' own clamp of 100) and
 * passes them in. This list is the DEFAULT so a story or a second embedder does not have to
 * restate three numbers to render the control.
 */
export const DEFAULT_SESSION_PAGE_SIZES = [25, 50, 100] as const;

export interface SessionLedgerControlsProps {
  status: SessionStatusFilter;
  onStatusChange: (status: SessionStatusFilter) => void;
  kind: SessionKindFilter;
  onKindChange: (kind: SessionKindFilter) => void;
  /** The raw search text. Debounced onto the URL by the container, not here. */
  search: string;
  onSearchChange: (search: string) => void;
  /**
   * People `searchUsers` matched for the current query, as pickable options. Empty while the
   * query is under the backend's own 2-character floor, while the search is in flight, or when it
   * genuinely matched nobody — the container distinguishes those three in the ledger's status
   * line, this control only renders what it is given.
   */
  userOptions: SelectFieldOption[];
  /** The picked person's subject, or `''` for "no user filter". */
  selectedUser: string;
  onSelectedUserChange: (subject: string) => void;
}

/**
 * `/admin/sessions`' FILTERS — status, kind, and the two-control user picker.
 *
 * 2026-09-03 (owner directive "filters are outside cards", ADR 0015 amendment A2): a FRAGMENT, not
 * a `<section>` with its own flex row, dropped into one `PageControlsGroup` by the container. Two
 * things left this component in the same change:
 *
 *  - its own `flex flex-wrap items-end gap-3` — that row is `PageControls` now, and the same four
 *    utilities were spelled in four sibling `*Controls` files;
 *  - **page size**, which was never a filter. It changes how much of the same set you see, never
 *    which set, and it wore `sm:ms-auto` precisely to hold itself apart from the three real
 *    filters beside it. It is its own trailing `PageControls` group now
 *    (`admin-sessions-centre.tsx`), which is what that `ms-auto` was trying to say. The sizes
 *    themselves stay here as {@link DEFAULT_SESSION_PAGE_SIZES}, since the vocabulary is this
 *    ledger's, not the row's.
 *
 * The user filter is TWO controls on purpose. The text box is the query `searchUsers` runs; the
 * select beside it is which of the matches the ledger is actually filtered by. They are separate
 * because they are separate facts: `querySessions` filters on an exact `subject`, so a typed
 * string can never be the filter itself — it can only be how the operator finds the person whose
 * subject is. Collapsing them into one combobox would hide that a choice is being made, and would
 * make "typed three characters, saw an unfiltered table" look like a bug rather than the honest
 * "pick which of these four people you meant".
 */
export function SessionLedgerControls({
  status,
  onStatusChange,
  kind,
  onKindChange,
  search,
  onSearchChange,
  userOptions,
  selectedUser,
  onSelectedUserChange,
}: SessionLedgerControlsProps) {
  return (
    <>
      <SegmentedControl
        aria-label="Session status filter"
        options={STATUS_OPTIONS}
        value={status}
        onChange={onStatusChange}
      />

      <SegmentedControl
        aria-label="Session kind filter"
        options={KIND_OPTIONS}
        value={kind}
        onChange={onKindChange}
      />

      <Field
        label="Search users"
        layout="inline"
        hideLabel
        placeholder="name or email…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />

      {/* Only once there is something to pick — an empty select is a control that cannot be used,
          and the reason it is empty belongs in the ledger's status line where the reader is
          already looking. */}
      {userOptions.length > 0 ? (
        <SelectField
          label="User"
          layout="inline"
          hideLabel
          value={selectedUser}
          options={[{ value: '', label: 'Any user' }, ...userOptions]}
          onChange={onSelectedUserChange}
        />
      ) : null}
    </>
  );
}
