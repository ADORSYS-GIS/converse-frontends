import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { ModelCatalogEntry } from '@lightbridge/authz-rpc';
import type { Account, Project } from '@lightbridge/hooks';

import { parseLimitDraft, ProjectSettingsView } from '../project-settings-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

const account: Account = {
  id: 'acc-1',
  defaultQuota: 't-m',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const project: Project = {
  id: 'proj-1',
  accountId: 'acc-1',
  name: 'production',
  billingPlan: 'free',
  billingIdentity: 'acme-inc',
  projectQuota: undefined,
  allowedModels: ['gpt-4o'],
  modelPolicy: 'allow_all',
  defaultLimits: { requests_per_second: 5, requests_per_day: null, concurrent_requests: null },
  status: 'active',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

// `gpt-4o` is already allowed on `project` above; `claude-sonnet-5` is a real catalogue entry the
// project has not (yet) restricted to.
const modelCatalog: ModelCatalogEntry[] = [
  { id: 'gpt-4o', name: 'gpt-4o' },
  { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
];

function renderView(overrides: Partial<React.ComponentProps<typeof ProjectSettingsView>> = {}) {
  return render(
    <ProjectSettingsView
      onBack={noop}
      onAddMember={noop}
      onRemoveMember={noop}
      onSetMemberRole={noop}
      onSetMemberQuotaTier={noop}
      accounts={[account]}
      projects={[project]}
      selectedAccountId="acc-1"
      selectedProjectId="proj-1"
      project={project}
      onSelectAccount={noop}
      onSelectProject={noop}
      onOpenAccountPicker={noop}
      onOpenProjectPicker={noop}
      onCreateProject={noop}
      onSaveDetails={noop}
      modelCatalog={modelCatalog}
      onToggleModel={noop}
      onRemoveStaleModels={noop}
      onSetModelRestriction={noop}
      onSaveLimits={noop}
      onDeleteProject={noop}
      onSuspendProject={noop}
      onEnableProject={noop}
      onSetDefaultProject={noop}
      {...overrides}
    />
  );
}

describe('parseLimitDraft', () => {
  it('maps an empty draft to null (no limit)', () => {
    expect(parseLimitDraft('')).toBeNull();
    expect(parseLimitDraft('   ')).toBeNull();
  });

  it('parses non-negative integers', () => {
    expect(parseLimitDraft('0')).toBe(0);
    expect(parseLimitDraft(' 42 ')).toBe(42);
  });

  it('rejects non-integer input as undefined (invalid)', () => {
    expect(parseLimitDraft('-1')).toBeUndefined();
    expect(parseLimitDraft('1.5')).toBeUndefined();
    expect(parseLimitDraft('abc')).toBeUndefined();
  });
});

describe('ProjectSettingsView', () => {
  it('renders the selected project details, models, and limits', async () => {
    await renderView();

    expect(screen.getByDisplayValue('production')).toBeTruthy();
    expect(screen.getByDisplayValue('free')).toBeTruthy();
    expect(screen.getByText('gpt-4o')).toBeTruthy();
    expect(screen.getByDisplayValue('5')).toBeTruthy();
  });

  it('disables Save until the project details are actually changed', async () => {
    await renderView();

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );

    await fireEvent.changeText(screen.getByDisplayValue('production'), 'production-2');

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      false
    );
  });

  it('calls onSaveDetails with the trimmed values', async () => {
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    await fireEvent.changeText(screen.getByDisplayValue('production'), '  production-2  ');
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveDetails).toHaveBeenCalledWith({ name: 'production-2', billingPlan: 'free' });
  });

  it('renders every catalogue model as a checkbox, checked exactly for the allowed subset', async () => {
    await renderView();

    // `gpt-4o` is in `project.allowedModels` -- checked. `claude-sonnet-5` is catalogue-only --
    // unchecked. This is the real assertion that would fail if the checked/unchecked mapping were
    // backwards.
    expect(screen.getByLabelText('gpt-4o').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('claude-sonnet-5').props.accessibilityState.checked).toBe(false);
  });

  it('calls onToggleModel(id, true) when checking an unchecked catalogue model', async () => {
    const onToggleModel = jest.fn();
    await renderView({ onToggleModel });

    await fireEvent.press(screen.getByLabelText('claude-sonnet-5'));

    expect(onToggleModel).toHaveBeenCalledWith('claude-sonnet-5', true);
  });

  it('calls onToggleModel(id, false) when unchecking an already-allowed model', async () => {
    const onToggleModel = jest.fn();
    await renderView({ onToggleModel });

    await fireEvent.press(screen.getByLabelText('gpt-4o'));

    expect(onToggleModel).toHaveBeenCalledWith('gpt-4o', false);
  });

  it('shows the all-models-allowed note when the allowlist is empty', async () => {
    await renderView({ project: { ...project, allowedModels: [] } });

    expect(screen.getByText('All models are allowed, including any added later.')).toBeTruthy();
    // Would fail if the "restricted count" summary rendered instead of the "all models" copy for
    // an empty selection -- i.e. if the empty-selection semantics were backwards.
    expect(screen.queryByText('1 model is allowed.')).toBeNull();
  });

  it('shows a restricted-count summary once at least one model is checked', async () => {
    await renderView();

    expect(screen.getByText('1 model is allowed.')).toBeTruthy();
  });

  it('renders a stored model no longer in the catalogue as a checked, labelled row that still round-trips', async () => {
    const onToggleModel = jest.fn();
    await renderView({
      onToggleModel,
      project: { ...project, allowedModels: ['gpt-4o', 'retired-model'] },
    });

    const staleCheckbox = screen.getByLabelText('retired-model');
    expect(staleCheckbox.props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('No longer in catalogue')).toBeTruthy();

    await fireEvent.press(staleCheckbox);
    expect(onToggleModel).toHaveBeenCalledWith('retired-model', false);
  });

  // Reported lockout: a project whose stored `allowedModels` carries ids the catalogue no longer
  // recognizes cannot save *any* change, because the server rejects the whole write while any
  // unknown id is present and every toggle re-sends the full list. The view's job is to make this
  // legible and give an explicit way out -- proven here as a real, named notice plus a working
  // button, not merely "some text appeared somewhere."
  it('shows a specific stale-entry notice naming every unrecognized id, with a working removal action', async () => {
    const onRemoveStaleModels = jest.fn();
    await renderView({
      onRemoveStaleModels,
      project: { ...project, allowedModels: ['gpt-4o', 'qwen3p7-plus', 'qwen3-5-9b-local'] },
    });

    expect(
      screen.getByText(
        'Saving will also remove 2 models no longer in the catalogue: qwen3p7-plus, qwen3-5-9b-local.'
      )
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Remove stale entries now'));
    expect(onRemoveStaleModels).toHaveBeenCalledTimes(1);
  });

  it('shows no stale-entry notice when every stored model is still in the catalogue', async () => {
    await renderView();

    expect(screen.queryByText('Remove stale entries now')).toBeNull();
  });

  it('renders the loading state before the catalogue resolves, with no checkboxes yet', async () => {
    await renderView({ isModelCatalogLoading: true, modelCatalog: [] });

    expect(screen.getByText('Loading the model catalogue...')).toBeTruthy();
    expect(screen.queryByLabelText('gpt-4o')).toBeNull();
    expect(screen.queryByLabelText('claude-sonnet-5')).toBeNull();
  });

  it('shows the catalogue-error copy and renders no checkboxes when the catalogue fails to load', async () => {
    await renderView({ isModelCatalogError: true, modelCatalog: [] });

    expect(
      screen.getByText(
        'The model catalogue is unavailable right now. Try again later to change which models are allowed.'
      )
    ).toBeTruthy();
    // No interactive controls at all while the catalogue is down -- nothing can be toggled, so no
    // save can accidentally fire against an incomplete/broken catalogue state.
    expect(screen.queryByLabelText('gpt-4o')).toBeNull();
  });

  it('shows the catalogue-empty copy when the operator has configured no models at all', async () => {
    await renderView({ modelCatalog: [], project: { ...project, allowedModels: [] } });

    expect(screen.getByText('No models are configured in the catalogue yet.')).toBeTruthy();
  });

  // ADR-0018's `Project.modelPolicy` -- read-only display only (no write path exists yet). These
  // prove the badge reflects the field, and that the two states with no reachable write path
  // today (`allowlist`, `deny_all`) still render distinctly rather than looking like a plain empty
  // allowlist -- see the "identical UI state, opposite meaning" trap this exists to avoid.
  describe('model access policy display', () => {
    // `project`'s base fixture already has a non-empty `allowedModels` (`['gpt-4o']`) -- this is
    // deliberately the INTERIM case (ai-helm-values#295): the gateway restricts to a non-empty
    // list regardless of `modelPolicy` today, so `allow_all` + non-empty must show the interim
    // callout, not silently imply the checked list has no effect.
    it('shows the restriction as off for the default allow_all policy, plus the interim restricted-today callout when the list is non-empty', async () => {
      await renderView({ project: { ...project, modelPolicy: 'allow_all' } });

      expect(screen.getByText('Model restriction')).toBeTruthy();
      // The segmented control is now the single statement of allow_all/allowlist -- the old
      // read-only badge said the same thing a second time, so it survives only for `deny_all`,
      // the one state the control deliberately has no segment for.
      expect(
        screen.getByRole('button', { name: 'All models' }).props.accessibilityState.selected
      ).toBe(true);
      expect(screen.queryByText(/blocks every model/)).toBeNull();
      expect(
        screen.getByText(
          'This project’s stored policy is "All models allowed," but a temporary safeguard currently restricts it to the 1 model checked below.'
        )
      ).toBeTruthy();
      // The restricted-count summary must also read as restricted, matching what the gateway
      // actually does today -- never "all models allowed" alongside a non-empty checked list.
      expect(screen.getByText('1 model is allowed.')).toBeTruthy();
    });

    // The genuinely-permissive case: allow_all with nothing checked. No interim callout here --
    // the gateway's stopgap only kicks in for a non-empty list, so this state is unaffected.
    it('shows the plain all-models copy for allow_all with an empty list, and no interim callout', async () => {
      await renderView({ project: { ...project, modelPolicy: 'allow_all', allowedModels: [] } });

      expect(screen.getByText('All models are allowed, including any added later.')).toBeTruthy();
      expect(screen.queryByText(/temporary safeguard/)).toBeNull();
    });

    it('shows the restriction as on for a non-empty allowlist and the restricted-count summary, with no interim callout (already accurate)', async () => {
      await renderView({ project: { ...project, modelPolicy: 'allowlist' } });

      expect(
        screen.getByRole('button', { name: 'Only selected' }).props.accessibilityState.selected
      ).toBe(true);
      expect(screen.getByText('1 model is allowed.')).toBeTruthy();
      // `allowlist`'s own badge/summary already say "restricted" -- the interim callout exists
      // only to correct `allow_all`'s otherwise-misleading "All models allowed" badge, so it must
      // not also fire here.
      expect(screen.queryByText(/temporary safeguard/)).toBeNull();
    });

    // The trap: an empty `allowedModels` means "everything" under allow_all but "nothing" under
    // allowlist -- identical checkbox state, opposite real-world meaning. This must never render
    // the same "All models are allowed" copy in both cases. Also: this exact combination is one
    // the app can no longer create itself (lightbridge-authz#431 refuses it server-side), so the
    // copy must say that plainly rather than implying a caller could still reach it today.
    it('shows a distinct "nothing allowed, legacy-only" summary for an empty allowlist, not the all-models copy', async () => {
      await renderView({
        project: { ...project, modelPolicy: 'allowlist', allowedModels: [] },
      });

      expect(
        screen.getByText(
          'The allowlist is empty, so no models are currently allowed for this project. New saves can no longer create this combination — if you see this, it predates that safeguard.'
        )
      ).toBeTruthy();
      expect(screen.queryByText('All models are allowed, including any added later.')).toBeNull();
    });

    it('shows a standalone warning banner for deny_all instead of an unlabeled empty list', async () => {
      await renderView({ project: { ...project, modelPolicy: 'deny_all' } });

      expect(screen.getByText('All models blocked')).toBeTruthy();
      expect(
        screen.getByText(
          'This project blocks every model regardless of the selections below. Choose a restriction above to let any of them take effect.'
        )
      ).toBeTruthy();
      // The checkbox list itself is still rendered (editing allowedModels is independent of the
      // policy write path) -- deny_all must not hide it, only explain that it has no effect.
      expect(screen.getByLabelText('gpt-4o')).toBeTruthy();
    });

    it('treats an unrecognized modelPolicy value as deny_all (fail-closed), matching the backend parse', async () => {
      await renderView({
        project: { ...project, modelPolicy: 'some-future-value' as unknown as string },
      });

      expect(screen.getByText('All models blocked')).toBeTruthy();
    });
  });

  // The on/off restriction control the repo owner asked for ("Also have the possibility to disable
  // all, so that all models (present and future) would be enabled"), wired to
  // `lightbridge-authz`#431's `setProjectModelPolicy`. Two segments, not a bare switch, because the
  // two states have opposite meanings that a single "on/off" affordance cannot name -- and because
  // `SegmentedControl` already supports the per-option `disabled` this section's central constraint
  // needs (see the empty-selection tests below).
  describe('model restriction control', () => {
    it('shows the restriction as off, with the checkbox list still selectable, under allow_all', async () => {
      await renderView({ project: { ...project, modelPolicy: 'allow_all' } });

      expect(
        screen.getByRole('button', { name: 'All models' }).props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByRole('button', { name: 'Only selected' }).props.accessibilityState.selected
      ).toBe(false);
    });

    it('shows the restriction as on under allowlist', async () => {
      await renderView({ project: { ...project, modelPolicy: 'allowlist' } });

      expect(
        screen.getByRole('button', { name: 'Only selected' }).props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByRole('button', { name: 'All models' }).props.accessibilityState.selected
      ).toBe(false);
    });

    it('turning the restriction off asks for allow_all', async () => {
      const onSetModelRestriction = jest.fn();
      await renderView({
        project: { ...project, modelPolicy: 'allowlist' },
        onSetModelRestriction,
      });

      await fireEvent.press(screen.getByRole('button', { name: 'All models' }));

      expect(onSetModelRestriction).toHaveBeenCalledWith(false);
    });

    it('turning the restriction on asks for allowlist when at least one model is checked', async () => {
      const onSetModelRestriction = jest.fn();
      await renderView({
        project: { ...project, modelPolicy: 'allow_all', allowedModels: ['gpt-4o'] },
        onSetModelRestriction,
      });

      await fireEvent.press(screen.getByRole('button', { name: 'Only selected' }));

      expect(onSetModelRestriction).toHaveBeenCalledWith(true);
    });

    // THE central constraint of this section: `setProjectModelPolicy` REFUSES `allowlist` while
    // the project's `allowedModels` is empty (400, lightbridge-authz#431) -- it does not warn, it
    // refuses. So the combination must be unreachable in the UI, never submitted and bounced. The
    // segment is disabled and says why, rather than being pressable and failing.
    it('makes the restriction un-turn-on-able while nothing is checked, and says why', async () => {
      const onSetModelRestriction = jest.fn();
      await renderView({
        project: { ...project, modelPolicy: 'allow_all', allowedModels: [] },
        onSetModelRestriction,
      });

      const restrictOption = screen.getByRole('button', { name: 'Only selected' });
      expect(restrictOption.props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(restrictOption);
      expect(onSetModelRestriction).not.toHaveBeenCalled();

      expect(
        screen.getByText(
          'Check at least one model below before you can restrict this project — restricting with nothing selected would block every model.'
        )
      ).toBeTruthy();
    });

    it('drops the needs-a-selection hint as soon as something is checked', async () => {
      await renderView({ project: { ...project, allowedModels: ['gpt-4o'] } });

      expect(screen.queryByText(/Check at least one model below/)).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Only selected' }).props.accessibilityState.disabled
      ).toBe(false);
    });

    // `allowedModels` is preserved server-side across a policy change in both directions
    // (lightbridge-authz#431), so the checkbox list must keep rendering the prior selection while
    // the restriction is off -- never blank out as though the list were lost.
    it('keeps the prior selection visibly checked while the restriction is off', async () => {
      await renderView({
        project: { ...project, modelPolicy: 'allow_all', allowedModels: ['gpt-4o'] },
      });

      expect(screen.getByLabelText('gpt-4o').props.accessibilityState.checked).toBe(true);
      expect(screen.getByLabelText('claude-sonnet-5').props.accessibilityState.checked).toBe(false);
    });

    // `deny_all` gets no control of its own (the owner did not ask for one), but a project already
    // on it must not read as an ordinary unrestricted or empty-allowlist state: neither segment is
    // selected, and #195's badge + callout still carry the meaning.
    it('selects neither segment for deny_all, leaving its badge and callout to explain the state', async () => {
      await renderView({ project: { ...project, modelPolicy: 'deny_all' } });

      expect(
        screen.getByRole('button', { name: 'All models' }).props.accessibilityState.selected
      ).toBe(false);
      expect(
        screen.getByRole('button', { name: 'Only selected' }).props.accessibilityState.selected
      ).toBe(false);
      expect(screen.getByText('All models blocked')).toBeTruthy();
      expect(
        screen.getByText(/blocks every model regardless of the selections below/)
      ).toBeTruthy();
    });

    it('disables both segments while a policy write is in flight', async () => {
      await renderView({ isSavingModelPolicy: true });

      expect(
        screen.getByRole('button', { name: 'All models' }).props.accessibilityState.disabled
      ).toBe(true);
      expect(
        screen.getByRole('button', { name: 'Only selected' }).props.accessibilityState.disabled
      ).toBe(true);
    });

    it('renders a rejected policy write as readable error text next to the control', async () => {
      await renderView({
        modelPolicyError:
          'cannot switch to allowlist while allowedModels is empty: set allowedModels first',
      });

      expect(
        screen.getByText(
          'cannot switch to allowlist while allowedModels is empty: set allowedModels first'
        )
      ).toBeTruthy();
    });
  });

  // lightbridge-authz#415/#417: `setProjectAllowedModels` can now reject a save (403 from
  // `project:update`, or a catalogue-validation rejection naming an unknown model id) -- the view
  // must render that, not swallow it. This is the presentational half of the guarantee; the
  // screen-level test (`__tests__/project-settings-screen.test.tsx`) proves the real hook's
  // `error` actually reaches this prop.
  it('renders modelsError text when the allowlist save is rejected', async () => {
    await renderView({
      modelsError: 'allowedModels contains an id not in the model catalogue: retired-model',
    });

    expect(
      screen.getByText('allowedModels contains an id not in the model catalogue: retired-model')
    ).toBeTruthy();
  });

  it('shows the allowlist-enforcement notice for a project with a non-empty allowlist', async () => {
    await renderView();

    await waitFor(() => expect(screen.getByText(/this allowlist is now enforced/)).toBeTruthy());
  });

  it('never shows the allowlist-enforcement notice for a project with an empty allowlist', async () => {
    await renderView({ project: { ...project, allowedModels: [] } });

    // Give any pending storage-read effects a turn — the notice must stay
    // absent either way, since an empty allowlist means nothing changed.
    await waitFor(() =>
      expect(screen.getByText('All models are allowed, including any added later.')).toBeTruthy()
    );
    expect(screen.queryByText(/this allowlist is now enforced/)).toBeNull();
  });

  it('calls onSaveLimits with parsed limits, mapping empty drafts to null', async () => {
    const onSaveLimits = jest.fn();
    await renderView({ onSaveLimits });

    await fireEvent.changeText(screen.getByDisplayValue('5'), '10');
    await fireEvent.press(screen.getByText('Save limits'));

    expect(onSaveLimits).toHaveBeenCalledWith({
      requests_per_second: 10,
      requests_per_day: null,
      concurrent_requests: null,
    });
  });

  it('disables Save limits when a draft is not a valid integer', async () => {
    await renderView();

    await fireEvent.changeText(screen.getByDisplayValue('5'), 'abc');

    expect(
      screen.getByRole('button', { name: 'Save limits' }).props.accessibilityState.disabled
    ).toBe(true);
  });

  it('calls onDeleteProject when the danger-zone button is pressed', async () => {
    const onDeleteProject = jest.fn();
    await renderView({ onDeleteProject });

    await fireEvent.press(screen.getByText('Delete project'));

    expect(onDeleteProject).toHaveBeenCalledTimes(1);
  });

  it('shows a Set as default action and an enabled Delete button for a non-default project', async () => {
    const onSetDefaultProject = jest.fn();
    await renderView({ onSetDefaultProject });

    await fireEvent.press(screen.getByText('Set as default'));
    expect(onSetDefaultProject).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole('button', { name: 'Delete project' }).props.accessibilityState.disabled
    ).toBe(false);
  });

  it('replaces the Set as default action with a badge and disables Delete for the default project', async () => {
    await renderView({ project: { ...project, isDefault: true } });

    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.queryByText('Set as default')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Delete project' }).props.accessibilityState.disabled
    ).toBe(true);
  });

  it('renders the empty state with a create action when there is no project', async () => {
    const onCreateProject = jest.fn();
    await renderView({ projects: [], project: undefined, onCreateProject });

    expect(
      screen.getAllByText('No projects in this account yet. Create one to get started.')
    ).toBeTruthy();

    await fireEvent.press(
      screen.getAllByLabelText('New project')[screen.getAllByLabelText('New project').length - 1]
    );

    expect(onCreateProject).toHaveBeenCalled();
  });

  it("renders the roster with each member's role and quota tier", async () => {
    await renderView({
      members: [
        {
          id: 'proj-1:sub-lead',
          projectId: 'proj-1',
          accountId: 'sub-lead',
          role: 'lead',
          quotaTier: 't-m',
          createdAt: '',
        },
        {
          id: 'proj-1:sub-plain',
          projectId: 'proj-1',
          accountId: 'sub-plain',
          role: 'member',
          quotaTier: null,
          createdAt: '',
        },
      ],
    });

    expect(screen.getByText('sub-lead')).toBeTruthy();
    expect(screen.getByText('sub-plain')).toBeTruthy();
    expect(screen.getByText('Lead')).toBeTruthy();
    expect(screen.getByDisplayValue('t-m')).toBeTruthy();
  });

  it('explains that a default project has no roster instead of showing an empty one', async () => {
    await renderView({ project: { ...project, isDefault: true }, members: [] });

    expect(
      screen.getByText(
        'This is your personal project — it has no members by design. Create a separate project to work with others.'
      )
    ).toBeTruthy();
    // No add control at all — the roster is structurally absent, not merely empty.
    expect(screen.queryByPlaceholderText('Account ID')).toBeNull();
  });

  it('adds a member as a plain member, leaving promotion a separate action', async () => {
    const onAddMember = jest.fn();
    await renderView({ onAddMember });

    await fireEvent.changeText(screen.getByPlaceholderText('Account ID'), '  sub-new  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Add member' }));

    expect(onAddMember).toHaveBeenCalledWith('sub-new', 'member');
  });

  it('toggles a member between lead and member', async () => {
    const onSetMemberRole = jest.fn();
    await renderView({
      members: [
        {
          id: 'proj-1:sub-plain',
          projectId: 'proj-1',
          accountId: 'sub-plain',
          role: 'member',
          quotaTier: null,
          createdAt: '',
        },
      ],
      onSetMemberRole,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Make lead' }));

    expect(onSetMemberRole).toHaveBeenCalledWith('sub-plain', 'lead');
  });

  it('surfaces a server-side lead-gating rejection', async () => {
    // project:member is necessary but not sufficient — the server also requires ownership or
    // role=lead, so the UI must show the 403 rather than silently doing nothing.
    await renderView({ memberError: 'Forbidden: only a project lead may change the roster' });

    expect(screen.getByText('Forbidden: only a project lead may change the roster')).toBeTruthy();
  });

  it('hides the members section entirely without the project:member capability', async () => {
    await renderView({ canManageMembers: false });

    expect(screen.queryByPlaceholderText('Account ID')).toBeNull();
  });

  /**
   * Regression coverage for the same class of bug as `AccountSettingsView`'s
   * `TypeError: f.trim is not a function` production incident (`f` was `defaultQuota`, itself an
   * RPC-sourced optional string reaching `.trim()` unguarded). `project.name`/`project.billingPlan`
   * are declared non-nullable strings, but they cross the same unchecked `as Project` cast the
   * generated RPC client applies to every response, so nothing actually guarantees they arrive as
   * strings at runtime either -- `as unknown as string` below simulates a value that violates that
   * assumption despite what TypeScript believes.
   */
  it('does not crash when project name/billingPlan arrive as non-string values', async () => {
    await renderView({
      project: {
        ...project,
        name: 42 as unknown as string,
        billingPlan: false as unknown as string,
      },
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  /** Same shape, for a roster member's `quotaTier` (`ProjectMember.quotaTier: string | null`). */
  it('does not crash when a member quotaTier arrives as a non-string value', async () => {
    await renderView({
      members: [
        {
          id: 'proj-1:sub-lead',
          projectId: 'proj-1',
          accountId: 'sub-lead',
          role: 'lead',
          quotaTier: 7 as unknown as string,
          createdAt: '',
        },
      ],
    });

    expect(screen.getByText('sub-lead')).toBeTruthy();
  });
});
