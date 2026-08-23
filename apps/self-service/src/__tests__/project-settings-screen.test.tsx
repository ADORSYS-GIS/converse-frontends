import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
// lightbridge-authz#415/#417: `allowedModels` is now `@readonly` on the generic model verbs --
// `setProjectAllowedModels` is the only write path. Set per-test to exercise `modelsError`.
let mockSetAllowedModelsError: unknown = null;
// Captures every `setAllowedModels.mutateAsync` call so the model-toggle plumbing tests below can
// assert exactly what `saveModels` sent to the RPC layer, without stubbing that logic away. Also
// keeps a (now-unused-by-`saveModels`) spy on `updateProject.mutateAsync` so a regression that
// silently reintroduces the old, now-inert write path is caught rather than passing by accident.
const mockUpdateProjectMutateAsync = jest.fn();
const mockSetAllowedModelsMutateAsync = jest.fn();
// lightbridge-authz#431's `setProjectModelPolicy` -- the restriction on/off write path.
// `mockRpcCallOrder` records BOTH procedures in the order they were actually invoked: the ordering
// guarantee is the entire point of the "turn restriction on" flow (the server refuses `allowlist`
// with a 400 while the project's CURRENT `allowedModels` is empty, so the list must be written
// FIRST), and per-spy `toHaveBeenCalledWith` assertions cannot express "before".
let mockRpcCallOrder: string[] = [];
const mockSetModelPolicyMutateAsync = jest.fn();
let mockSetModelPolicyError: unknown = null;
// Mutated per-test to control what `projectModels()` (screen.tsx) sees as the project's current
// `allowedModels` -- the input the toggle-off/toggle-on tests need to exercise the real branch.
let mockProjectAllowedModels: string[] | undefined;
// Mutated per-test to control what `useModelCatalog` reports -- the stale-entry lockout tests
// below need a real, non-empty catalogue to prove which ids `saveModels` strips as "no longer
// recognized". Defaults to empty, matching every pre-existing test in this file that never
// exercised the catalogue-aware filtering path.
let mockModelCatalog: { id: string; name: string }[] = [];

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
    useModelCatalog: () => ({ data: mockModelCatalog, isLoading: false, isError: false }),
    useUpdateProject: () => ({
      mutateAsync: mockUpdateProjectMutateAsync,
      isPending: false,
      error: null,
    }),
    useSetProjectAllowedModels: () => ({
      mutateAsync: mockSetAllowedModelsMutateAsync,
      isPending: false,
      error: mockSetAllowedModelsError,
    }),
    useSetProjectModelPolicy: () => ({
      mutateAsync: mockSetModelPolicyMutateAsync,
      isPending: false,
      error: mockSetModelPolicyError,
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
      modelsError?: string | null;
      modelPolicyError?: string | null;
      onToggleModel: (model: string, checked: boolean) => void;
      onRemoveStaleModels: () => void;
      onSetModelRestriction: (restricted: boolean) => void;
    }) => (
      <>
        <Text testID="status-error">{props.statusError ?? ''}</Text>
        <Text testID="member-error">{props.memberError ?? ''}</Text>
        <Text testID="set-default-error">{props.setDefaultError ?? ''}</Text>
        <Text testID="models-error">{props.modelsError ?? ''}</Text>
        <Text testID="model-policy-error">{props.modelPolicyError ?? ''}</Text>
        {/* Stand-ins for pressing a model checkbox / the "remove stale entries" action -- exercise
         * the real `handleToggleModel`/`handleRemoveStaleModels`/`saveModels` plumbing in
         * project-settings-screen.tsx, not a re-implementation of it. */}
        <Pressable
          testID="toggle-gpt-4o-off"
          onPress={() => props.onToggleModel('gpt-4o', false)}
        />
        <Pressable
          testID="toggle-claude-on"
          onPress={() => props.onToggleModel('claude-sonnet-5', true)}
        />
        <Pressable testID="remove-stale-models" onPress={() => props.onRemoveStaleModels()} />
        {/* Stand-ins for the restriction segmented control -- the real view disables the "on"
         * segment when nothing is checked, but the SCREEN must refuse that combination too, so
         * these stand-ins deliberately stay pressable in both states. */}
        <Pressable testID="restriction-on" onPress={() => props.onSetModelRestriction(true)} />
        <Pressable testID="restriction-off" onPress={() => props.onSetModelRestriction(false)} />
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
  mockSetAllowedModelsError = null;
  mockProjectAllowedModels = undefined;
  mockModelCatalog = [];
  mockSetModelPolicyError = null;
  mockRpcCallOrder = [];
  mockUpdateProjectMutateAsync.mockReset().mockResolvedValue(undefined);
  mockSetAllowedModelsMutateAsync.mockReset().mockImplementation(async () => {
    mockRpcCallOrder.push('setProjectAllowedModels');
  });
  mockSetModelPolicyMutateAsync.mockReset().mockImplementation(async () => {
    mockRpcCallOrder.push('setProjectModelPolicy');
  });
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
    expect(screen.getByTestId('models-error').props.children).toBe('');
  });
});

// This is the actual empty-selection semantics guarantee the checkbox rewrite must preserve:
// `Project.allowedModels` NULL/`[]` means "all models allowed" server-side, not "no models
// allowed" -- see the module doc comment on `handleToggleModel` in project-settings-screen.tsx.
// These exercise the real screen-level plumbing (`handleToggleModel` -> `saveModels` ->
// `setAllowedModels.mutateAsync`), not a re-implementation of it, via the `onToggleModel`
// stand-ins wired into the mocked view above.
//
// lightbridge-authz#415/#417: `allowedModels` moved from `model.Project.update` to the dedicated
// `setProjectAllowedModels` procedure (`@readonly` on the generic verb now). Every test in this
// block asserts the NEW call shape (`projectId`/`allowedModels`, not `id`/`input.allowedModels`)
// and that `updateProject.mutateAsync` -- the old, now write-inert path -- is never touched by a
// model-toggle at all. Proved to fail for the right reason first: before this file's mocks were
// updated to know about `useSetProjectAllowedModels`, every test in this suite failed with
// `TypeError: (0 , _hooks.useSetProjectAllowedModels) is not a function`, because the screen calls
// the hook unconditionally on every render -- not merely a stale assertion on an unreached branch.
describe('ProjectSettingsScreen -- model-toggle plumbing sends the correct allowedModels payload', () => {
  it('unchecking the only currently-allowed model sends [] (all models allowed), not omitted or dropped', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = [
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
    ];

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-gpt-4o-off'));

    expect(mockSetAllowedModelsMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      allowedModels: [],
    });
    expect(mockUpdateProjectMutateAsync).not.toHaveBeenCalled();
  });

  it('checking an additional model sends exactly the resulting subset, not the whole catalogue', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = [
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
    ];

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-claude-on'));

    expect(mockSetAllowedModelsMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      allowedModels: ['gpt-4o', 'claude-sonnet-5'],
    });
    expect(mockUpdateProjectMutateAsync).not.toHaveBeenCalled();
  });

  // Reported bug: a project whose `allowedModels` already carries ids that predate #415/#417's
  // catalogue validation (e.g. `qwen3p7-plus`, `qwen3-5-9b-local`) cannot save *any* change --
  // every toggle re-sends the full current list, the server rejects the whole write while any
  // unknown id is present, and unchecking one stale id at a time still leaves the other(s) in the
  // payload. `saveModels` must strip every id the catalogue doesn't recognize before it ever
  // reaches the RPC layer, on every save, not only on an explicit cleanup action -- proven here by
  // toggling on an unrelated, valid model and asserting the stale ids never reach the wire.
  it('strips stale catalogue ids from the payload on an ordinary toggle, unblocking the save the server would otherwise reject', async () => {
    mockProjectAllowedModels = ['gpt-4o', 'qwen3p7-plus', 'qwen3-5-9b-local'];
    mockModelCatalog = [
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
    ];

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-claude-on'));

    expect(mockSetAllowedModelsMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      allowedModels: ['gpt-4o', 'claude-sonnet-5'],
    });
  });

  // The explicit "Remove stale entries" action (`onRemoveStaleModels`, wired to the view's
  // "Remove stale entries now" button) -- sends the current list with only the stale ids dropped,
  // no other change, for a caller who wants just the cleanup.
  it('removing stale entries explicitly sends the current list with only the unrecognized ids dropped', async () => {
    mockProjectAllowedModels = ['gpt-4o', 'qwen3p7-plus', 'qwen3-5-9b-local'];
    mockModelCatalog = [
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
    ];

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('remove-stale-models'));

    expect(mockSetAllowedModelsMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      allowedModels: ['gpt-4o'],
    });
  });

  // The `.catch(() => undefined)` this call site used to end in swallowed the rejection outright
  // -- contradicting `saveModels`'s own doc comment that a rejection "is a real, reachable outcome
  // the caller must see, not a console.error swallow". `modelsError` (asserted elsewhere in this
  // file) already derives from `setAllowedModels.error`, which react-query sets independently of
  // what the caller does with the returned promise -- but the swallow still meant a real
  // production rejection left no trace anywhere a developer could find it. This proves the
  // rejection is now logged, matching every other mutation handler on this screen
  // (`handleSaveDetails`/`handleSaveLimits`) instead of vanishing silently.
  it('logs a real setProjectAllowedModels rejection instead of swallowing it silently', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = [
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
    ];
    const rejection = new Error('RPC call failed with code validation_error (status 422)');
    mockSetAllowedModelsMutateAsync.mockReset().mockRejectedValue(rejection);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-claude-on'));
    // Let the rejected mutateAsync promise's `.catch` handler run.
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to update project allowed models:',
      rejection
    );
    consoleErrorSpy.mockRestore();
  });

  it('surfaces a real setProjectAllowedModels rejection (403, or #415 catalogue validation) as modelsError, not a silent no-op', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = [
      { id: 'gpt-4o', name: 'gpt-4o' },
      { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
    ];
    mockSetAllowedModelsError = {
      name: 'CratestackRpcError',
      status: 422,
      code: 'validation_error',
      body: {
        code: 'validation_error',
        message: 'allowedModels contains an id not in the model catalogue: claude-sonnet-5',
      },
      message:
        'RPC call failed with code validation_error (status 422): allowedModels contains an id not in the model catalogue: claude-sonnet-5',
    };

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('toggle-claude-on'));

    expect(screen.getByTestId('models-error').props.children).toBe(
      'allowedModels contains an id not in the model catalogue: claude-sonnet-5'
    );
  });
});

// The restriction on/off write path (lightbridge-authz#431's `setProjectModelPolicy`). Three
// contract facts from that PR drive every test here:
//   1. `allowlist` + an empty/absent `allowedModels` is REFUSED with a 400 -- not warned about.
//   2. `allowedModels` is PRESERVED across a policy change in both directions; the procedure
//      writes only the `modelPolicy` column and never touches the list.
//   3. Unrecognised policy values are refused, never coerced.
// (1) is why the ORDER matters: turning the restriction on must write the list before the policy,
// or the policy write hits the refusal. The view disables its "on" segment while nothing is
// checked, but the screen must not depend on that -- a stand-in that stays pressable in both
// states is wired in the mocked view above precisely so this layer's own guard is exercised.
describe('ProjectSettingsScreen -- model restriction toggle write ordering', () => {
  const catalog = [
    { id: 'gpt-4o', name: 'gpt-4o' },
    { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
  ];

  it('turning the restriction OFF sends allow_all and nothing else', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = catalog;

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('restriction-off'));

    expect(mockSetModelPolicyMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      modelPolicy: 'allow_all',
    });
    // Turning restriction off must NOT rewrite the list: the server preserves it, so touching it
    // here could only lose the selection the user gets back when they re-enable the restriction.
    expect(mockSetAllowedModelsMutateAsync).not.toHaveBeenCalled();
    expect(mockUpdateProjectMutateAsync).not.toHaveBeenCalled();
  });

  it('turning the restriction ON writes the list FIRST, then the policy', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = catalog;

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('restriction-on'));
    await waitFor(() => expect(mockSetModelPolicyMutateAsync).toHaveBeenCalled());

    expect(mockRpcCallOrder).toEqual(['setProjectAllowedModels', 'setProjectModelPolicy']);
    expect(mockSetAllowedModelsMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      allowedModels: ['gpt-4o'],
    });
    expect(mockSetModelPolicyMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      modelPolicy: 'allowlist',
    });
  });

  it('never sends the policy write when the list write rejects, so the 400 is never even attempted', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = catalog;
    mockSetAllowedModelsMutateAsync
      .mockReset()
      .mockRejectedValue(new Error('RPC call failed with code permission_denied (status 403)'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('restriction-on'));
    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());

    expect(mockSetModelPolicyMutateAsync).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // The refusal from (1), guarded at the screen layer as well as the view layer. The stand-in
  // pressable above is deliberately still pressable with an empty list -- if this guard were
  // missing, `setProjectModelPolicy` would be called and the server would answer 400.
  it('refuses to submit the restriction at all while nothing is selected', async () => {
    mockProjectAllowedModels = [];
    mockModelCatalog = catalog;

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('restriction-on'));

    expect(mockSetModelPolicyMutateAsync).not.toHaveBeenCalled();
    expect(mockSetAllowedModelsMutateAsync).not.toHaveBeenCalled();
  });

  // Same refusal, reached the other way: every stored id is stale, so the catalogue-filtered
  // selection `saveModels` would actually send is empty even though `allowedModels` is not.
  it('refuses to submit the restriction when every selected model is stale, not just when the list is literally empty', async () => {
    mockProjectAllowedModels = ['qwen3p7-plus', 'qwen3-5-9b-local'];
    mockModelCatalog = catalog;

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('restriction-on'));

    expect(mockSetModelPolicyMutateAsync).not.toHaveBeenCalled();
    expect(mockSetAllowedModelsMutateAsync).not.toHaveBeenCalled();
  });

  // (2), from the frontend's side: the round trip off-and-back-on must re-send exactly the same
  // list, never an emptied one. `allowedModels` is untouched by the off leg, so the on leg sees
  // the same selection it started with.
  it('restores the same selection when the restriction is turned off and back on', async () => {
    mockProjectAllowedModels = ['gpt-4o', 'claude-sonnet-5'];
    mockModelCatalog = catalog;

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('restriction-off'));
    await waitFor(() => expect(mockSetModelPolicyMutateAsync).toHaveBeenCalledTimes(1));
    await fireEvent.press(screen.getByTestId('restriction-on'));
    await waitFor(() => expect(mockSetModelPolicyMutateAsync).toHaveBeenCalledTimes(2));

    expect(mockRpcCallOrder).toEqual([
      'setProjectModelPolicy',
      'setProjectAllowedModels',
      'setProjectModelPolicy',
    ]);
    expect(mockSetAllowedModelsMutateAsync).toHaveBeenCalledWith({
      projectId: 'proj-1',
      accountId: 'acc-1',
      allowedModels: ['gpt-4o', 'claude-sonnet-5'],
    });
  });

  it('surfaces a rejected policy write as modelPolicyError instead of swallowing it', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = catalog;
    mockSetModelPolicyError = {
      name: 'CratestackRpcError',
      status: 400,
      code: 'bad_request',
      body: {
        code: 'bad_request',
        message:
          'cannot set modelPolicy to allowlist while allowedModels is empty; set allowedModels first',
      },
      message:
        'RPC call failed with code bad_request (status 400): cannot set modelPolicy to allowlist while allowedModels is empty; set allowedModels first',
    };

    await render(<ProjectSettingsScreen />);

    expect(screen.getByTestId('model-policy-error').props.children).toBe(
      'cannot set modelPolicy to allowlist while allowedModels is empty; set allowedModels first'
    );
  });

  it('logs a real setProjectModelPolicy rejection rather than dropping it on the floor', async () => {
    mockProjectAllowedModels = ['gpt-4o'];
    mockModelCatalog = catalog;
    const rejection = new Error('RPC call failed with code bad_request (status 400)');
    mockSetModelPolicyMutateAsync.mockReset().mockRejectedValue(rejection);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await render(<ProjectSettingsScreen />);
    await fireEvent.press(screen.getByTestId('restriction-off'));
    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update project model policy:',
        rejection
      )
    );

    consoleErrorSpy.mockRestore();
  });
});
