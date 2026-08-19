import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

// Regression coverage for the same bug as budget-refill-screen.test.tsx: `getApiErrorMessage`
// used to read the Axios `error.response.data` shape and otherwise fall back to a technical
// `Error.message` string (e.g. `RPC call failed with code internal (status 403): ...`).
// `CratestackRpcError` (the generated RPC client's actual thrown error) never has `.response`, so
// `memberError`/`statusError`/`setDefaultError` degraded to that raw technical string on every
// real failure -- see packages/hooks/src/api-error.ts's module comment. This mocks
// `@lightbridge/hooks`'s data hooks but keeps the REAL `getApiErrorMessage` (via the
// dependency-free `@lightbridge/hooks/api-error` subpath) so the screen's actual derivation is
// exercised. `ProjectSettingsView` itself is a large presentational component covered by its own
// tests (`views/settings/__tests__/project-settings-view.test.tsx`); it's stubbed here purely to
// expose the three derived error props as queryable text, same pattern as
// `__tests__/api-keys-screen.test.tsx`'s stub of its list view.
let mockDisableProjectError: unknown = null;
let mockEnableProjectError: unknown = null;
let mockSetDefaultProjectError: unknown = null;
let mockAddMemberError: unknown = null;
// Captures every `updateProject.mutateAsync` call so the model-toggle plumbing tests below can
// assert exactly what `saveModels` sent to the RPC layer, without stubbing that logic away.
const mockUpdateProjectMutateAsync = jest.fn();
// Mutated per-test to control what `projectModels()` (screen.tsx) sees as the project's current
// `allowedModels` -- the input the toggle-off/toggle-on tests need to exercise the real branch.
let mockProjectAllowedModels: string[] | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('@lightbridge/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@lightbridge/ui/sheet', () => ({
  useSheet: () => ({ present: jest.fn() }),
}));

// Must be its own top-level `mock`-prefixed function -- babel-plugin-jest-hoist's scope check
// trips on identifiers referenced inside a jest.mock() factory otherwise. Same pattern as
// __tests__/api-keys-screen.test.tsx.
function mockUseQueryState(_key: string): [string | null, (value: string | null) => void] {
  return require('react').useState(null);
}

jest.mock('@lightbridge/hooks', () => {
  const apiError = jest.requireActual('@lightbridge/hooks/api-error');
  return {
    __esModule: true,
    ...apiError,
    useAllAccounts: () => ({ data: [{ id: 'acc-1' }], isLoading: false, totalCount: 1 }),
    useAllProjects: () => ({
      data: [
        {
          id: 'proj-1',
          name: 'Project One',
          isDefault: false,
          isActive: true,
          allowedModels: mockProjectAllowedModels,
        },
      ],
      isLoading: false,
      totalCount: 1,
    }),
    useProjectMembers: () => ({ data: [], isLoading: false }),
    useModelCatalog: () => ({ data: [], isLoading: false, isError: false }),
    useUpdateProject: () => ({
      mutateAsync: mockUpdateProjectMutateAsync,
      isPending: false,
      error: null,
    }),
    useDisableProject: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
      error: mockDisableProjectError,
    }),
    useEnableProject: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
      error: mockEnableProjectError,
    }),
    useSetDefaultProject: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
      error: mockSetDefaultProjectError,
    }),
    useAddProjectMember: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
      error: mockAddMemberError,
    }),
    useRemoveProjectMember: () => ({ mutateAsync: jest.fn(), isPending: false, error: null }),
    useSetProjectMemberRole: () => ({ mutateAsync: jest.fn(), isPending: false, error: null }),
    useSetProjectMemberQuotaTier: () => ({ mutateAsync: jest.fn(), isPending: false, error: null }),
    usePermissions: () => ({ has: () => true }),
    useQueryState: mockUseQueryState,
  };
});

jest.mock('../views/settings/project-settings-view', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ProjectSettingsView: (props: {
      statusError?: string | null;
      memberError?: string | null;
      setDefaultError?: string | null;
      onToggleModel: (model: string, checked: boolean) => void;
    }) => (
      <>
        <Text testID="status-error">{props.statusError ?? ''}</Text>
        <Text testID="member-error">{props.memberError ?? ''}</Text>
        <Text testID="set-default-error">{props.setDefaultError ?? ''}</Text>
        {/* Stand-ins for pressing a model checkbox -- exercises the real `handleToggleModel` /
         * `saveModels` plumbing in project-settings-screen.tsx, not a re-implementation of it. */}
        <Pressable
          testID="toggle-gpt-4o-off"
          onPress={() => props.onToggleModel('gpt-4o', false)}
        />
        <Pressable
          testID="toggle-claude-on"
          onPress={() => props.onToggleModel('claude-sonnet-5', true)}
        />
      </>
    ),
  };
});

import { ProjectSettingsScreen } from '../screens/project-settings-screen';

beforeEach(() => {
  mockDisableProjectError = null;
  mockEnableProjectError = null;
  mockSetDefaultProjectError = null;
  mockAddMemberError = null;
  mockProjectAllowedModels = undefined;
  mockUpdateProjectMutateAsync.mockReset().mockResolvedValue(undefined);
});

describe('ProjectSettingsScreen -- derives error copy from a real CratestackRpcError, not an Axios shape', () => {
  it('surfaces the real server message for a status-change 403, not the technical Error.message', async () => {
    mockDisableProjectError = {
      name: 'CratestackRpcError',
      status: 403,
      code: 'permission_denied',
      body: {
        code: 'permission_denied',
        message: 'Forbidden: only the project lead can disable this project.',
      },
      message:
        'RPC call failed with code permission_denied (status 403): Forbidden: only the project lead can disable this project.',
    };

    await render(<ProjectSettingsScreen />);

    expect(screen.getByTestId('status-error').props.children).toBe(
      'Forbidden: only the project lead can disable this project.'
    );
  });

  it("replaces readErrorBody's own placeholder text with a generic message instead of leaking it", async () => {
    mockSetDefaultProjectError = {
      name: 'CratestackRpcError',
      status: 403,
      code: 'internal',
      body: {
        code: 'internal',
        message: 'RPC call returned status 403 with an unrecognized error body',
      },
      message:
        'RPC call failed with code internal (status 403): RPC call returned status 403 with an unrecognized error body',
    };

    await render(<ProjectSettingsScreen />);

    const setDefaultError = screen.getByTestId('set-default-error').props.children;
    expect(setDefaultError).not.toMatch(/unrecognized error body/i);
    expect(setDefaultError).toBe('Something went wrong. Please try again.');
  });

  it('surfaces a real member-mutation error message the same way', async () => {
    mockAddMemberError = {
      name: 'CratestackRpcError',
      status: 409,
      code: 'conflict',
      body: { code: 'conflict', message: 'This account is already a member of the project.' },
      message:
        'RPC call failed with code conflict (status 409): This account is already a member of the project.',
    };

    await render(<ProjectSettingsScreen />);

    expect(screen.getByTestId('member-error').props.children).toBe(
      'This account is already a member of the project.'
    );
  });

  it('shows no error text at all when nothing failed', async () => {
    await render(<ProjectSettingsScreen />);

    expect(screen.getByTestId('status-error').props.children).toBe('');
    expect(screen.getByTestId('member-error').props.children).toBe('');
    expect(screen.getByTestId('set-default-error').props.children).toBe('');
  });
});

// This is the actual empty-selection semantics guarantee the checkbox rewrite must preserve:
// `Project.allowedModels` NULL/`[]` means "all models allowed" server-side, not "no models
// allowed" -- see the module doc comment on `handleToggleModel` in project-settings-screen.tsx.
// These exercise the real screen-level plumbing (`handleToggleModel` -> `saveModels` ->
// `updateProject.mutateAsync`), not a re-implementation of it, via the `onToggleModel` stand-ins
// wired into the mocked view above.
describe('ProjectSettingsScreen -- model-toggle plumbing sends the correct allowedModels payload', () => {
  it('unchecking the only currently-allowed model sends [] (all models allowed), not omitted or dropped', async () => {
    mockProjectAllowedModels = ['gpt-4o'];

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-gpt-4o-off'));

    expect(mockUpdateProjectMutateAsync).toHaveBeenCalledWith({
      id: 'proj-1',
      accountId: 'acc-1',
      input: { allowedModels: [] },
    });
  });

  it('checking an additional model sends exactly the resulting subset, not the whole catalogue', async () => {
    mockProjectAllowedModels = ['gpt-4o'];

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-claude-on'));

    expect(mockUpdateProjectMutateAsync).toHaveBeenCalledWith({
      id: 'proj-1',
      accountId: 'acc-1',
      input: { allowedModels: ['gpt-4o', 'claude-sonnet-5'] },
    });
  });
});
