import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withNuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  OVERVIEW_SELECTION_OPTIONS,
  useCreateAccountDialogParams,
  useOverviewParams,
  useProjectScopeParams,
} from './url-state';

/**
 * The claim ADR 0011 Decision 2 actually makes — **"the URL is the cross-zone state bus"** — and
 * the only way to check it is with two rendered components that share nothing but the query
 * string.
 *
 * That is not an artificial setup. The console's shell is mounted once and every route is split
 * across three App Router segments (`children`, `@rail`, `@scope`) which are three separate React
 * subtrees: no context, no props and no common ancestor below the layout can carry state between
 * them. `Rail` and `Centre` below are those two subtrees, deliberately siblings with no shared
 * state of their own — exactly the shape that used to require `ConsoleViewStateProviders`.
 *
 * `hasMemory: true` makes nuqs' testing adapter behave like a real address bar (a write is
 * readable by the next reader) rather than only reporting writes; `onUrlUpdate` is what lets the
 * history-behaviour assertions below check the thing users feel — whether Back undoes a knob
 * twiddle or a selection.
 */

function Rail() {
  const [view, setView] = useOverviewParams();
  return (
    <div>
      <button type="button" onClick={() => void setView({ range: '7d' })}>
        rail: last 7 days
      </button>
      <button type="button" onClick={() => void setView({ range: '30d' })}>
        rail: last 30 days
      </button>
      <button
        type="button"
        onClick={() => void setView({ series: 'proj_7' }, OVERVIEW_SELECTION_OPTIONS)}>
        rail: select series
      </button>
      <output data-testid="rail-range">{view.range}</output>
    </div>
  );
}

function Centre() {
  const [view] = useOverviewParams();
  return (
    <div>
      <output data-testid="centre-range">{view.range}</output>
      <output data-testid="centre-bucket">{view.bucket}</output>
      <output data-testid="centre-series">{view.series || 'none'}</output>
    </div>
  );
}

function Zones() {
  return (
    <>
      <Rail />
      <Centre />
    </>
  );
}

describe('the URL as the cross-zone state bus', () => {
  it('restores the same view state in every zone from a shared URL', () => {
    render(<Zones />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '?range=90d&bucket=week&series=proj_2' }),
    });

    // The acceptance criterion, in its simplest form: a link carries the view, and every zone
    // that renders part of that view agrees on it without being told by any of the others.
    expect(screen.getByTestId('rail-range')).toHaveTextContent('90d');
    expect(screen.getByTestId('centre-range')).toHaveTextContent('90d');
    expect(screen.getByTestId('centre-bucket')).toHaveTextContent('week');
    expect(screen.getByTestId('centre-series')).toHaveTextContent('proj_2');
  });

  it('lets the rail change a param that the centre then reads', async () => {
    const user = userEvent.setup();
    render(<Zones />, { wrapper: withNuqsTestingAdapter({ hasMemory: true }) });

    expect(screen.getByTestId('centre-range')).toHaveTextContent('30d');

    await user.click(screen.getByRole('button', { name: 'rail: last 7 days' }));

    expect(screen.getByTestId('centre-range')).toHaveTextContent('7d');
    expect(screen.getByTestId('rail-range')).toHaveTextContent('7d');
  });

  it('twiddles knobs with history: replace and makes selections with history: push', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(<Zones />, { wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }) });

    await user.click(screen.getByRole('button', { name: 'rail: last 7 days' }));
    // A range change is a knob: it must not cost a Back press, or dragging through four options
    // would bury the page the user actually came from.
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].options.history).toBe('replace');
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?range=7d');

    await user.click(screen.getByRole('button', { name: 'rail: select series' }));
    // Selecting a series IS navigation: Back deselects rather than leaving the screen.
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].options.history).toBe('push');
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get('series')).toBe('proj_7');
  });

  it('removes a param again when it returns to its default', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(<Zones />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '?range=7d', hasMemory: true, onUrlUpdate }),
    });

    await user.click(screen.getByRole('button', { name: 'rail: last 30 days' }));

    // `clearOnDefault`: the URL a user shares carries only what they actually changed.
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('');
    expect(screen.getByTestId('centre-range')).toHaveTextContent('30d');
  });
});

/**
 * IA v3 phase 1 ("account into the path"): the account half of scope moved to a path segment
 * (`/accounts/[accountId]/*`, `client/use-account-id.ts`), so it is no longer a URL param this
 * file's cross-zone claim needs to cover — only the project half remains one.
 */
function ScopeWriter() {
  const [, setScope] = useProjectScopeParams();
  return (
    <button type="button" onClick={() => void setScope({ projectId: 'proj_3' })}>
      pick project
    </button>
  );
}

function ScopeReader() {
  const [scope] = useProjectScopeParams();
  return <output data-testid="scope">{scope.projectId || 'all'}</output>;
}

describe('project scope', () => {
  it('crosses zones and writes a push entry', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(
      <>
        <ScopeWriter />
        <ScopeReader />
      </>,
      { wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }) }
    );

    expect(screen.getByTestId('scope')).toHaveTextContent('all');

    await user.click(screen.getByRole('button', { name: 'pick project' }));

    expect(screen.getByTestId('scope')).toHaveTextContent('proj_3');
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    expect(onUrlUpdate.mock.calls[0][0].queryString).toBe('?project=proj_3');
    expect(onUrlUpdate.mock.calls[0][0].options.history).toBe('push');
  });
});

/**
 * ADR-0026 (lightbridge-authz#564, one identity may own several accounts): "+ New account" opens
 * from two structurally separate subtrees — the workspace switcher, mounted in the chrome, and
 * `/settings/account`'s own `PageHeader` action — that share nothing but the query string, the
 * same shape `scope` above already proves out. `Switcher`/`Screen` below stand in for those two.
 */
function Switcher() {
  const [, setParams] = useCreateAccountDialogParams();
  return (
    <button type="button" onClick={() => void setParams({ open: true })}>
      switcher: + New account
    </button>
  );
}

function Screen() {
  const [params, setParams] = useCreateAccountDialogParams();
  return (
    <div>
      <output data-testid="create-account-open">{String(params.open)}</output>
      <button type="button" onClick={() => void setParams({ open: false })}>
        screen: cancel
      </button>
    </div>
  );
}

describe('createAccount dialog', () => {
  it('opens from the switcher and is read by the settings screen sharing nothing else', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(
      <>
        <Switcher />
        <Screen />
      </>,
      { wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }) }
    );

    expect(screen.getByTestId('create-account-open')).toHaveTextContent('false');

    await user.click(screen.getByRole('button', { name: 'switcher: + New account' }));

    expect(screen.getByTestId('create-account-open')).toHaveTextContent('true');
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?new-account=true');
    // Real view state: Back closes it, same as every other dialog flag in this module.
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].options.history).toBe('push');

    await user.click(screen.getByRole('button', { name: 'screen: cancel' }));

    expect(screen.getByTestId('create-account-open')).toHaveTextContent('false');
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('');
  });
});
