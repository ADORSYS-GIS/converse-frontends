import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import {
  getApiErrorMessage,
  useAllAccounts,
  useAllProjects,
  useDisableProject,
  useEnableProject,
  useModelCatalog,
  usePermissions,
  useAddProjectMember,
  useProjectMembers,
  useQueryState,
  useRemoveProjectMember,
  useSetDefaultProject,
  useSetProjectAllowedModels,
  useSetProjectMemberQuotaTier,
  useSetProjectMemberRole,
  useUpdateProject,
} from '@lightbridge/hooks';
import type { Account, Project } from '@lightbridge/hooks';
import { useSheet } from '@lightbridge/ui/sheet';
import {
  pickerTruncationNotice,
  toAccountPickerOptions,
  toProjectPickerOptions,
} from '../components/entity-picker-field';
import { usePickerSheet } from '../hooks/use-picker-sheet';
import { useThemeColors } from '../hooks/use-theme-colors';
import { ProjectSettingsView } from '../views/settings/project-settings-view';
import type {
  ProjectDefaultLimits,
  ProjectDetailsInput,
} from '../views/settings/project-settings-view';
import { CreateProjectSheet } from './create-project-sheet';
import { DeleteProjectSheet } from './delete-project-sheet';

export function ProjectSettingsScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const router = useRouter();
  const { t } = useTranslation();
  const sheet = useSheet();
  const openPicker = usePickerSheet();
  const colors = useThemeColors();
  const { has } = usePermissions();
  // Account/project selection lives in the URL (?accountId=…&projectId=…) so it
  // survives refresh and deep-links — same pattern as the API-keys screen.
  const [accountParam, setAccountParam] = useQueryState('accountId');
  const [projectParam, setProjectParam] = useQueryState('projectId');

  // Full lists (every page) — see the identical comment in api-keys-screen.tsx. The old
  // `useAccounts()`/`useProjects(accountId)` calls here (capped at `limit: 10`) were the actual
  // truncation bug: an account's 11th project was unreachable and nothing on screen said so.
  const {
    data: accountsData = [],
    isLoading: isAccountsLoading,
    totalCount: accountsTotalCount,
  } = useAllAccounts();
  const accounts: Account[] = accountsData;
  const accountId = accountParam ?? accounts[0]?.id;

  const {
    data: projectsData = [],
    isLoading: isProjectsLoading,
    totalCount: projectsTotalCount,
  } = useAllProjects(accountId);
  const projects: Project[] = projectsData;

  const projectParamInList = projects.some((project) => project.id === projectParam);
  const projectId = (projectParamInList ? projectParam : undefined) ?? projects[0]?.id;
  const project = projects.find((item) => item.id === projectId);

  const updateProject = useUpdateProject();
  const setAllowedModels = useSetProjectAllowedModels();
  const disableProject = useDisableProject();
  const enableProject = useEnableProject();
  const setDefaultProject = useSetDefaultProject();

  // Only fetched once the caller can actually edit the allowlist -- a read-only viewer has no use
  // for the catalogue (mirrors `useBillingPlans(canChoosePlan)` in api-key-create-screen.tsx).
  const canUpdate = has('project:update');
  const {
    data: modelCatalog = [],
    isLoading: isModelCatalogLoading,
    isError: isModelCatalogError,
  } = useModelCatalog(canUpdate);

  // A default project has no roster by construction, so don't even ask the server for one.
  const { data: members, isLoading: isLoadingMembers } = useProjectMembers(
    project?.isDefault ? undefined : projectId
  );
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const setMemberRole = useSetProjectMemberRole();
  const setMemberQuotaTier = useSetProjectMemberQuotaTier();

  const handleAddMember = (accountId: string, role: 'lead' | 'member') => {
    if (!projectId) return;
    void addMember.mutateAsync({ projectId, accountId, role }).catch(() => undefined);
  };

  const handleRemoveMember = (accountId: string) => {
    if (!projectId) return;
    void removeMember.mutateAsync({ projectId, accountId }).catch(() => undefined);
  };

  const handleSetMemberRole = (accountId: string, role: 'lead' | 'member') => {
    if (!projectId) return;
    void setMemberRole.mutateAsync({ projectId, accountId, role }).catch(() => undefined);
  };

  const handleSetMemberQuotaTier = (accountId: string, quotaTier: string) => {
    if (!projectId) return;
    void setMemberQuotaTier
      .mutateAsync({ projectId, accountId, quotaTier: quotaTier === '' ? undefined : quotaTier })
      .catch(() => undefined);
  };

  // Covers both the `project:update` 403 and #415's new catalogue-validation rejection -- see
  // `saveModels`'s comment above for why this must never be a silent console.error swallow.
  const modelsError = setAllowedModels.error ? getApiErrorMessage(setAllowedModels.error) : null;

  // The coarse permission is not the whole story: the server also demands account ownership or
  // role='lead', so a permitted-looking caller still gets a 403. Surface it rather than swallow it.
  const memberError =
    [addMember.error, removeMember.error, setMemberRole.error, setMemberQuotaTier.error]
      .filter(Boolean)
      .map((error) => getApiErrorMessage(error))
      .at(0) ?? null;

  const handleSelectAccount = (id: string) => {
    setAccountParam(id);
    setProjectParam(null);
  };

  const accountOptions = toAccountPickerOptions(accounts);
  const projectOptions = toProjectPickerOptions(projects, projectId, colors);

  const handleOpenAccountPicker = () => {
    openPicker({
      options: accountOptions,
      selectedId: accountId,
      onSelect: handleSelectAccount,
      searchPlaceholder: t('picker.searchAccounts'),
      noResultsLabel: t('picker.noResults'),
      title: t('picker.selectAccount'),
      resultCountLabel: t('picker.accountCount', { count: accountOptions.length }),
      optionAccessibilityLabel: (option) =>
        t('settings.project.selectAccount', { account: option.label }),
      truncationNotice: pickerTruncationNotice(
        accountOptions.length,
        accountsTotalCount,
        t('settings.picker.truncationNotice')
      ),
    });
  };

  const handleOpenProjectPicker = () => {
    openPicker({
      options: projectOptions,
      selectedId: projectId,
      onSelect: setProjectParam,
      searchPlaceholder: t('picker.searchProjects'),
      noResultsLabel: t('picker.noResults'),
      title: t('picker.selectProject'),
      resultCountLabel: t('picker.projectCount', { count: projectOptions.length }),
      optionAccessibilityLabel: (option) =>
        t('settings.project.selectProject', { project: option.label }),
      truncationNotice: pickerTruncationNotice(
        projectOptions.length,
        projectsTotalCount,
        t('settings.picker.truncationNotice')
      ),
    });
  };

  const handleSaveDetails = ({ name, billingPlan }: ProjectDetailsInput) => {
    if (!project || !accountId) return;
    void updateProject
      .mutateAsync({
        id: project.id,
        accountId,
        input: { name, billingPlan },
      })
      .catch((error) => {
        console.error('Failed to update project details:', error);
      });
  };

  // `Project.allowedModels` is `@readonly` on the generic model verbs (lightbridge-authz#415/#417)
  // -- `setProjectAllowedModels` is the only write path left, and unlike the other saves on this
  // screen, a rejection here (403 from the `project:update` gate, or a catalogue-validation
  // rejection naming an unknown model id) is a real, reachable outcome the caller must see, not a
  // console.error swallow. `[]` is sent (never `undefined`/`null`) for "no models checked" so the
  // "all models allowed" wire representation stays an explicit, deliberate empty array rather than
  // an accidental no-op update.
  //
  // A stale/renamed id from before #415's catalogue validation existed is stripped here,
  // unconditionally, before every save -- not just on the explicit "Remove stale entries" action.
  // Without this, a project already carrying such an id was a hard lockout: the server rejects the
  // *entire* write while any unknown id is present, and every single-checkbox toggle re-sends the
  // full current list, so no toggle could ever produce a payload the server would accept unless it
  // happened to drop every stale id at once. Safe to filter unconditionally: the checkbox list (and
  // therefore every call into this function) only renders once `modelCatalog` has loaded
  // successfully -- see `isModelCatalogLoading`/`isModelCatalogError` in
  // `project-settings-view.tsx` -- so `modelCatalog` is never empty-because-not-yet-loaded here.
  const saveModels = (models: string[]) => {
    if (!project || !accountId) return;
    const catalogIds = new Set(modelCatalog.map((entry) => entry.id));
    const filtered = models.filter((id) => catalogIds.has(id));
    void setAllowedModels
      .mutateAsync({
        projectId: project.id,
        accountId,
        allowedModels: filtered,
      })
      .catch((error) => {
        console.error('Failed to update project allowed models:', error);
      });
  };

  const projectModels = (): string[] =>
    Array.isArray(project?.allowedModels) ? (project.allowedModels as string[]) : [];

  // Single toggle handler for the checkbox list -- replaces the old free-text add/remove pair.
  // `checked: false` on the last remaining model naturally lands on `[]`, which is exactly the
  // "all models allowed" wire representation `saveModels` already sent for that case before this
  // change (see `handleRemoveModel`'s old behavior) -- this preserves that semantics rather than
  // reinventing it.
  const handleToggleModel = (model: string, checked: boolean) => {
    const models = projectModels();
    if (checked) {
      if (models.includes(model)) return;
      saveModels([...models, model]);
    } else {
      saveModels(models.filter((item) => item !== model));
    }
  };

  // The explicit "Remove stale entries" action in the view -- sends the current list unchanged
  // except for whatever `saveModels` itself strips. Exists for a caller who wants only the
  // cleanup, not as a side effect of toggling some unrelated model.
  const handleRemoveStaleModels = () => {
    saveModels(projectModels());
  };

  const handleSaveLimits = (limits: ProjectDefaultLimits) => {
    if (!project || !accountId) return;
    void updateProject
      .mutateAsync({
        id: project.id,
        accountId,
        input: { defaultLimits: limits },
      })
      .catch((error) => {
        console.error('Failed to update default limits:', error);
      });
  };

  const handleCreateProject = () => {
    if (!accountId) return;
    sheet.present(({ dismiss }) => (
      <CreateProjectSheet
        accountId={accountId}
        onClose={dismiss}
        onCreated={(newProjectId) => setProjectParam(newProjectId)}
      />
    ));
  };

  const handleDeleteProject = () => {
    if (!project || !accountId) return;
    const { id, name } = project;
    sheet.present(({ dismiss }) => (
      <DeleteProjectSheet
        id={id}
        name={name}
        accountId={accountId}
        onClose={dismiss}
        onDeleted={() => setProjectParam(null)}
      />
    ));
  };

  const handleSuspendProject = () => {
    if (!project || !accountId) return;
    void disableProject.mutateAsync({ id: project.id, accountId });
  };

  const handleEnableProject = () => {
    if (!project || !accountId) return;
    void enableProject.mutateAsync({ id: project.id, accountId });
  };

  const handleSetDefaultProject = () => {
    if (!project || !accountId) return;
    void setDefaultProject.mutateAsync({ id: project.id, accountId });
  };

  const statusError = disableProject.error
    ? getApiErrorMessage(disableProject.error)
    : enableProject.error
      ? getApiErrorMessage(enableProject.error)
      : null;

  const setDefaultError = setDefaultProject.error
    ? getApiErrorMessage(setDefaultProject.error)
    : null;

  return (
    <ProjectSettingsView
      showBackButton={!embedded}
      onBack={() => router.back()}
      accounts={accounts}
      projects={projects}
      selectedAccountId={accountId}
      selectedProjectId={projectId}
      project={project}
      isLoading={isAccountsLoading || isProjectsLoading}
      onSelectAccount={handleSelectAccount}
      onSelectProject={setProjectParam}
      onOpenAccountPicker={handleOpenAccountPicker}
      onOpenProjectPicker={handleOpenProjectPicker}
      onCreateProject={handleCreateProject}
      onSaveDetails={handleSaveDetails}
      isSavingDetails={updateProject.isPending}
      modelCatalog={modelCatalog}
      isModelCatalogLoading={isModelCatalogLoading}
      isModelCatalogError={isModelCatalogError}
      onToggleModel={handleToggleModel}
      onRemoveStaleModels={handleRemoveStaleModels}
      isSavingModels={setAllowedModels.isPending}
      modelsError={modelsError}
      onSaveLimits={handleSaveLimits}
      isSavingLimits={updateProject.isPending}
      canCreate={has('project:create')}
      canUpdate={canUpdate}
      canDelete={has('project:delete')}
      canDisable={has('project:disable')}
      onDeleteProject={handleDeleteProject}
      onSuspendProject={handleSuspendProject}
      onEnableProject={handleEnableProject}
      isChangingStatus={disableProject.isPending || enableProject.isPending}
      statusError={statusError}
      members={members}
      isLoadingMembers={isLoadingMembers}
      onAddMember={handleAddMember}
      onRemoveMember={handleRemoveMember}
      onSetMemberRole={handleSetMemberRole}
      onSetMemberQuotaTier={handleSetMemberQuotaTier}
      isSavingMembers={
        addMember.isPending ||
        removeMember.isPending ||
        setMemberRole.isPending ||
        setMemberQuotaTier.isPending
      }
      canManageMembers={has('project:member')}
      memberError={memberError}
      onSetDefaultProject={handleSetDefaultProject}
      isSettingDefault={setDefaultProject.isPending}
      setDefaultError={setDefaultError}
    />
  );
}
