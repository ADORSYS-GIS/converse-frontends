import React from 'react';
import { useRouter } from 'expo-router';
import {
  useAccounts,
  useProjects,
  useQueryState,
  useUpdateProject,
} from '@lightbridge/hooks';
import type { ApiKeyBackendAccount, ApiKeyBackendDefaultLimits, ApiKeyBackendProject } from '@lightbridge/api-rest';
import { useSheet } from '@lightbridge/ui/sheet';
import { ProjectSettingsView } from '../views/settings/project-settings-view';
import type { ProjectDetailsInput } from '../views/settings/project-settings-view';
import { CreateProjectSheet } from './create-project-sheet';
import { DeleteProjectSheet } from './delete-project-sheet';

export function ProjectSettingsScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const router = useRouter();
  const sheet = useSheet();
  // Account/project selection lives in the URL (?accountId=…&projectId=…) so it
  // survives refresh and deep-links — same pattern as the API-keys screen.
  const [accountParam, setAccountParam] = useQueryState('accountId');
  const [projectParam, setProjectParam] = useQueryState('projectId');

  const { data: accountsData = [], isLoading: isAccountsLoading } = useAccounts();
  const accounts: ApiKeyBackendAccount[] = accountsData;
  const accountId = accountParam ?? accounts[0]?.id;

  const { data: projectsData = [], isLoading: isProjectsLoading } = useProjects(accountId);
  const projects: ApiKeyBackendProject[] = projectsData;

  const projectParamInList = projects.some((project) => project.id === projectParam);
  const projectId = (projectParamInList ? projectParam : undefined) ?? projects[0]?.id;
  const project = projects.find((item) => item.id === projectId);

  const updateProject = useUpdateProject();

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
        input: { name, billing_plan: billingPlan },
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
        input: { allowed_models: models },
      })
      .catch((error) => {
        console.error('Failed to update allowed models:', error);
      });
  };

  const handleAddModel = (model: string) => {
    const models = project?.allowed_models ?? [];
    if (models.includes(model)) return;
    saveModels([...models, model]);
  };

  const handleRemoveModel = (model: string) => {
    const models = project?.allowed_models ?? [];
    saveModels(models.filter((item) => item !== model));
  };

  const handleSaveLimits = (limits: ApiKeyBackendDefaultLimits) => {
    if (!project || !accountId) return;
    void updateProject
      .mutateAsync({
        id: project.id,
        accountId,
        input: { default_limits: limits },
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
      onDeleteProject={handleDeleteProject}
    />
  );
}
