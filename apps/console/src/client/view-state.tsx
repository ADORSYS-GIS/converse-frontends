'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type {
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
  ProjectRow,
  ReportExportFormat,
  AdminReviewTab,
} from '@lightbridge/ui-web';

/**
 * Route-scoped view state, shared between a route's centre (`children`) and its right rail
 * (`@rail`).
 *
 * Why a context and not component state: the console's shell is mounted **once**, in
 * `app/(console)/layout.tsx`, and the rail arrives through an App Router **parallel route** — so
 * the centre and the rail are two separate route segments, in two separate React subtrees. They
 * still parameterise each other (the FILTERS rail decides what the ledger shows; the ledger's
 * selection decides what the SELECTION rail displays), so the state they share has to live above
 * both, which means in the layout that renders both.
 *
 * These stores hold **UI state only** — filter values, page numbers, selections, dialog targets.
 * No fetching happens here: data comes from refine/TanStack hooks in the per-route
 * `use-*-screen` hooks, and the same query key from both sides is deduplicated into one request
 * by TanStack Query's cache.
 *
 * All four are mounted unconditionally by the console layout. That is deliberate and cheap: each
 * is a single `useState` over a small object, and mounting them per route is impossible anyway —
 * a route's own `layout.tsx` wraps only `children`, never the sibling `@rail` slot.
 */

interface ViewStateStore<T> {
  Provider: (props: { children: ReactNode }) => ReactNode;
  /** Returns `[state, patch]`. `patch` merges a partial into the current state. */
  use: () => readonly [T, (patch: Partial<T>) => void];
}

function createViewState<T extends object>(name: string, initial: T): ViewStateStore<T> {
  const Context = createContext<readonly [T, (patch: Partial<T>) => void] | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<T>(initial);
    const patch = useCallback(
      (next: Partial<T>) => setState((current) => ({ ...current, ...next })),
      []
    );
    const value = useMemo(() => [state, patch] as const, [state, patch]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function use() {
    const value = useContext(Context);
    if (!value) {
      throw new Error(`${name} must be used inside the (console) layout's view-state providers.`);
    }
    return value;
  }

  return { Provider, use };
}

// ── overview

export interface OverviewViewState {
  range: string;
  bucket: string;
  groupBy: string;
  modelFilter: string;
  selectedSeriesKey: string | null;
}

const overview = createViewState<OverviewViewState>('useOverviewViewState', {
  range: '30d',
  bucket: 'day',
  groupBy: 'project',
  modelFilter: 'all',
  selectedSeriesKey: null,
});

// ── api keys

export interface ApiKeysViewState {
  page: number;
  statusFilter: string;
  search: string;
  selectedRowKeys: string[];
  revokeTarget: ApiKeysRevokeTarget | null;
  secretReveal: ApiKeysSecretReveal | null;
  actionError: string | null;
}

const apiKeys = createViewState<ApiKeysViewState>('useApiKeysViewState', {
  page: 1,
  statusFilter: 'all',
  search: '',
  selectedRowKeys: [],
  revokeTarget: null,
  secretReveal: null,
  actionError: null,
});

// ── manage

export interface ManageViewState {
  page: number;
  search: string;
  statusValue: string;
  budgetStateValue: string;
  selectedProject: ProjectRow | null;
  notice: string | undefined;
  period: string;
  reportGroupBy: string;
  format: ReportExportFormat;
  includes: Record<string, boolean>;
}

const manage = createViewState<ManageViewState>('useManageViewState', {
  page: 1,
  search: '',
  statusValue: 'all',
  budgetStateValue: 'all',
  selectedProject: null,
  notice: undefined,
  // The current month, resolved once at module load — the report period a user almost always
  // wants, and stable for the session rather than re-read on every render.
  period: new Date().toISOString().slice(0, 7),
  reportGroupBy: 'project',
  format: 'csv',
  includes: { totals: true, 'per-model': false },
});

// ── admin

export interface AdminViewState {
  activeTab: AdminReviewTab;
  selectedRequestId: string | null;
  note: string;
  /**
   * Whether the last decision failed.
   *
   * Shared rather than read off the mutation's own `isError`, because the decision is submitted
   * from whichever zone is showing the review panel — the rail at `lg`, the centre's selection
   * sheet below it — while the failure has to surface in the CENTRE's queue error line. Two zones
   * mean two `useMutation` instances, so one instance's `isError` is invisible to the other.
   */
  decideFailed: boolean;
}

const admin = createViewState<AdminViewState>('useAdminViewState', {
  activeTab: 'pending',
  selectedRequestId: null,
  note: '',
  decideFailed: false,
});

export const useOverviewViewState = overview.use;
export const useApiKeysViewState = apiKeys.use;
export const useManageViewState = manage.use;
export const useAdminViewState = admin.use;

/** Every route's view-state store, mounted once by `app/(console)/layout.tsx`. */
export function ConsoleViewStateProviders({ children }: { children: ReactNode }) {
  return (
    <overview.Provider>
      <apiKeys.Provider>
        <manage.Provider>
          <admin.Provider>{children}</admin.Provider>
        </manage.Provider>
      </apiKeys.Provider>
    </overview.Provider>
  );
}
