import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// api-keys-screen.tsx pulls in `@lightbridge/hooks` (which drags in auth-session and the
// generated authz-rpc client) — mock the barrel with just the hooks the screen actually calls
// at render time, same spirit as the subpath-import workaround documented elsewhere in this
// test suite (see use-pagination.test.tsx / use-query-state.test.tsx).
const mockAccounts = [{ id: 'acc-1' }];
const mockProjectsByAccount: Record<string, { id: string; name: string }[]> = {
  'acc-1': [
    { id: 'proj-1', name: 'Project One' },
    { id: 'proj-2', name: 'Project Two' },
  ],
};
// A full page (length === limit) so the "hasMore" heuristic reports true and the Next
// control is enabled — matches a project with more than one page of API keys.
const mockItems: { id: string }[] = Array.from({ length: 10 }, (_, i) => ({ id: `key-${i}` }));
// Must be named with a `mock` prefix — babel-plugin-jest-hoist only allows referencing
// out-of-scope variables from inside a jest.mock() factory when the name starts with "mock".
const mockUseApiKeys = jest.fn(
  (_projectId?: string, _options: { offset?: number; limit?: number } = {}) => ({
    data: mockItems,
    isLoading: false,
  })
);
// Minimal real query-param state so selecting a different account/project actually re-renders
// the screen with a new effective accountId/projectId, the way the real URL-backed hook does.
// Defined as its own top-level `mock`-prefixed function (rather than inline in the jest.mock
// factory below) because babel-plugin-jest-hoist's scope check trips even on identifiers that
// only appear inside a TS type annotation of an inline arrow function.
function mockUseQueryState(_key: string): [string | null, (value: string | null) => void] {
  return require('react').useState(null);
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@lightbridge/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@lightbridge/ui/sheet', () => ({
  useSheet: () => ({ present: jest.fn() }),
}));

jest.mock('@lightbridge/hooks', () => {
  const actual = jest.requireActual('@lightbridge/hooks/pagination');
  return {
    __esModule: true,
    usePagination: actual.usePagination,
    useAccounts: () => ({ data: mockAccounts, isLoading: false }),
    useProjects: (accountId?: string) => ({
      data: accountId ? (mockProjectsByAccount[accountId] ?? []) : [],
      isLoading: false,
    }),
    useApiKeys: (projectId?: string, options?: { offset?: number; limit?: number }) =>
      mockUseApiKeys(projectId, options),
    usePermissions: () => ({ has: () => true }),
    useQueryState: mockUseQueryState,
  };
});

// Stub out the view (owned by another area of the app) so this test stays focused on the
// screen's own pagination wiring: it renders the props the screen passes down as simple,
// queryable controls instead of the full list UI.
jest.mock('../views/api-keys-list-view', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ApiKeysListView: (props: {
      items: { id: string }[];
      selectedProjectId?: string;
      onSelectProject: (id: string) => void;
    }) => (
      <>
        <Text testID="items-count">{props.items.length}</Text>
        <Text testID="selected-project">{props.selectedProjectId ?? ''}</Text>
        <Pressable testID="select-project-2" onPress={() => props.onSelectProject('proj-2')}>
          <Text>select project 2</Text>
        </Pressable>
      </>
    ),
  };
});

import { ApiKeysScreen } from '../screens/api-keys-screen';

describe('ApiKeysScreen pagination wiring', () => {
  beforeEach(() => {
    mockUseApiKeys.mockClear();
  });

  it('requests the first page (offset 0) on initial render', async () => {
    await render(<ApiKeysScreen />);

    expect(mockUseApiKeys).toHaveBeenCalledWith('proj-1', { offset: 0, limit: 10 });
  });

  it('advances the offset passed to useApiKeys when Next is pressed', async () => {
    await render(<ApiKeysScreen />);
    mockUseApiKeys.mockClear();

    await act(async () => fireEvent.press(screen.getByLabelText('pagination.next')));

    expect(mockUseApiKeys).toHaveBeenCalledWith('proj-1', { offset: 10, limit: 10 });
  });

  it('Previous is disabled on page 1', async () => {
    await render(<ApiKeysScreen />);

    const prev = screen.getByLabelText('pagination.previous');
    expect(prev.props.accessibilityState.disabled).toBe(true);
  });

  it('resets back to offset 0 when the selected project changes', async () => {
    await render(<ApiKeysScreen />);

    // Page forward first, so there is something to reset from.
    await act(async () => fireEvent.press(screen.getByLabelText('pagination.next')));
    expect(mockUseApiKeys).toHaveBeenLastCalledWith('proj-1', { offset: 10, limit: 10 });

    mockUseApiKeys.mockClear();
    await act(async () => fireEvent.press(screen.getByTestId('select-project-2')));

    expect(mockUseApiKeys).toHaveBeenLastCalledWith('proj-2', { offset: 0, limit: 10 });
  });
});
