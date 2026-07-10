import React from 'react';
import { useCreateProject } from '@lightbridge/hooks';
import { CreateProjectView } from '../views/create-project-view';

type CreateProjectSheetProps = {
  accountId: string;
  /** Dismiss the hosting sheet (Cancel or after a successful create). */
  onClose: () => void;
  /** Called with the new project id so the caller can select it. */
  onCreated?: (projectId: string) => void;
};

/**
 * Content for the create-project bottom sheet. Owns the domain wiring (the
 * useCreateProject mutation) and composes the presentational CreateProjectView;
 * it is presented imperatively via `useSheet().present(...)`, so it takes its
 * params as props rather than reading the URL.
 */
export function CreateProjectSheet({
  accountId,
  onClose,
  onCreated,
}: Readonly<CreateProjectSheetProps>) {
  const createProject = useCreateProject();

  const handleConfirm = async ({
    name,
    billingPlan,
  }: {
    name: string;
    billingPlan: string;
  }) => {
    const project = await createProject.mutateAsync({
      accountId,
      input: { name, billing_plan: billingPlan },
    });
    onCreated?.(project.id);
    onClose();
  };

  return (
    <CreateProjectView
      loading={createProject.isPending}
      onCancel={onClose}
      onConfirm={(input) => {
        void handleConfirm(input).catch((error) => {
          console.error('Failed to create project:', error);
        });
      }}
    />
  );
}
