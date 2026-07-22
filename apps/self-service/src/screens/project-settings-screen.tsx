import React from 'react';
import { useRouter } from 'expo-router';
import {
  getApiErrorMessage,
  useAccounts,
  useDisableProject,
  useEnableProject,
  usePermissions,
  useProjects,
  useQueryState,
  useUpdateProject,
} from '@lightbridge/hooks';
import type { Account, Project } from '@lightbridge/authz-rpc';
import { useSheet } from '@lightbridge/ui/sheet';
import { ProjectSettingsView } from '../views/settings/project-settings-view';
import type {
  ProjectDefaultLimits,
  ProjectDetailsInput,
} from '../views/settings/project-settings-view';
import { CreateProjectSheet } from './create-project-sheet';
import { DeleteProjectSheet } from './delete-project-sheet';

export function ProjectSettingsScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const router = useRouter();
  const sheet = useSheet();
  const { has } = usePermissions();
  // Account/project selection lives in the URL (?accountId=…&projectId=…) so it
  // survives refresh and deep-links — same pattern as the API-keys screen.
  const [accountParam, setAccountParam] = useQueryState('accountId');
  const [projectParam, setProjectParam] = useQueryState('projectId');

  const { data: accountsData = [], isLoading: isAccountsLoading } = useAccounts();
  const accounts: Account[] = accountsData;
  const accountId = accountParam ?? accounts[0]?.id;

  const { data: projectsData = [], isLoading: isProjectsLoading } = useProjects(accountId);
  const projects: Project[] = projectsData;

  const projectParamInList = projects.some((project) => project.id === projectParam);
  const projectId = (projectParamInList ? projectParam : undefined) ?? projects[0]?.id;
  const project = projects.find((item) => item.id === projectId);

  const updateProject = useUpdateProject();
  const disableProject = useDisableProject();
  const enableProject = useEnableProject();

  const handleSelectAccount = (id: string) => {
    setAccountParam(id);
    setProjectParam(null);
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

  const saveModels = (models: string[]) => {
    if (!project || !accountId) return;
    void updateProject
      .mutateAsync({
        id: project.id,
        accountId,
        input: { allowedModels: models },
      })
      .catch((error) => {
        console.error('Failed to update allowed models:', error);
      });
  };

  const projectModels = (): string[] =>
    Array.isArray(project?.allowedModels) ? (project.allowedModels as string[]) : [];

  const handleAddModel = (model: string) => {
    const models = projectModels();
    if (models.includes(model)) return;
    saveModels([...models, model]);
  };

  const handleRemoveModel = (model: string) => {
    const models = projectModels();
    saveModels(models.filter((item) => item !== model));
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

  const statusError = disableProject.error
    ? getApiErrorMessage(disableProject.error)
    : enableProject.error
      ? getApiErrorMessage(enableProject.error)
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
      onCreateProject={handleCreateProject}
      onSaveDetails={handleSaveDetails}
      isSavingDetails={updateProject.isPending}
      onAddModel={handleAddModel}
      onRemoveModel={handleRemoveModel}
      isSavingModels={updateProject.isPending}
      onSaveLimits={handleSaveLimits}
      isSavingLimits={updateProject.isPending}
      canCreate={has('project:create')}
      canUpdate={has('project:update')}
      canDelete={has('project:delete')}
      canDisable={has('project:disable')}
      onDeleteProject={handleDeleteProject}
      onSuspendProject={handleSuspendProject}
      onEnableProject={handleEnableProject}
      isChangingStatus={disableProject.isPending || enableProject.isPending}
      statusError={statusError}
    />
  );
}
