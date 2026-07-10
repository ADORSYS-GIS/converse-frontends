import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';
import {
  Button,
  Card,
  Chip,
  designTokens,
  Div,
  Divider,
  EmptyState,
  Heading,
  PageHeader,
  Scroll,
  SectionCard,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import type {
  ApiKeyBackendAccount,
  ApiKeyBackendDefaultLimits,
  ApiKeyBackendProject,
} from '@lightbridge/api-rest';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { formatDate } from '../api-keys-list-view';

export type ProjectDetailsInput = {
  name: string;
  billingPlan: string;
};

type ProjectSettingsViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  accounts?: ApiKeyBackendAccount[];
  projects?: ApiKeyBackendProject[];
  selectedAccountId?: string;
  selectedProjectId?: string;
  project?: ApiKeyBackendProject;
  isLoading?: boolean;
  onSelectAccount: (id: string) => void;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onSaveDetails: (input: ProjectDetailsInput) => void;
  isSavingDetails?: boolean;
  onAddModel: (model: string) => void;
  onRemoveModel: (model: string) => void;
  isSavingModels?: boolean;
  onSaveLimits: (limits: ApiKeyBackendDefaultLimits) => void;
  isSavingLimits?: boolean;
  onDeleteProject: () => void;
};

/** Renders a nullable numeric limit as a text-field draft ('' = no limit). */
const limitToDraft = (value?: number | null) => (value == null ? '' : String(value));

/**
 * Parses a limit draft back to the API shape: '' means "no limit" (null),
 * anything else must be a non-negative integer — otherwise undefined (invalid).
 */
export const parseLimitDraft = (draft: string): number | null | undefined => {
  const trimmed = draft.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
};

export function ProjectSettingsView({
  showBackButton = true,
  onBack,
  accounts = [],
  projects = [],
  selectedAccountId,
  selectedProjectId,
  project,
  isLoading = false,
  onSelectAccount,
  onSelectProject,
  onCreateProject,
  onSaveDetails,
  isSavingDetails = false,
  onAddModel,
  onRemoveModel,
  isSavingModels = false,
  onSaveLimits,
  isSavingLimits = false,
  onDeleteProject,
}: Readonly<ProjectSettingsViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [nameDraft, setNameDraft] = useState(project?.name ?? '');
  const [planDraft, setPlanDraft] = useState(project?.billing_plan ?? '');
  const [newModel, setNewModel] = useState('');
  const [rpsDraft, setRpsDraft] = useState(limitToDraft(project?.default_limits?.requests_per_second));
  const [rpdDraft, setRpdDraft] = useState(limitToDraft(project?.default_limits?.requests_per_day));
  const [concurrentDraft, setConcurrentDraft] = useState(
    limitToDraft(project?.default_limits?.concurrent_requests)
  );

  useEffect(() => {
    setNameDraft(project?.name ?? '');
    setPlanDraft(project?.billing_plan ?? '');
    setNewModel('');
    setRpsDraft(limitToDraft(project?.default_limits?.requests_per_second));
    setRpdDraft(limitToDraft(project?.default_limits?.requests_per_day));
    setConcurrentDraft(limitToDraft(project?.default_limits?.concurrent_requests));
  }, [project]);

  const trimmedName = nameDraft.trim();
  const trimmedPlan = planDraft.trim();
  const hasDetailsChanged =
    !!project && (trimmedName !== project.name || trimmedPlan !== project.billing_plan);
  const canSaveDetails =
    hasDetailsChanged && trimmedName.length > 0 && trimmedPlan.length > 0 && !isSavingDetails;

  const models = project?.allowed_models ?? [];
  const trimmedNewModel = newModel.trim();

  const handleAddModel = () => {
    if (!trimmedNewModel || models.includes(trimmedNewModel)) return;
    onAddModel(trimmedNewModel);
    setNewModel('');
  };

  const parsedRps = parseLimitDraft(rpsDraft);
  const parsedRpd = parseLimitDraft(rpdDraft);
  const parsedConcurrent = parseLimitDraft(concurrentDraft);
  const limitsValid =
    parsedRps !== undefined && parsedRpd !== undefined && parsedConcurrent !== undefined;
  const hasLimitsChanged =
    !!project &&
    (parsedRps !== (project.default_limits?.requests_per_second ?? null) ||
      parsedRpd !== (project.default_limits?.requests_per_day ?? null) ||
      parsedConcurrent !== (project.default_limits?.concurrent_requests ?? null));
  const canSaveLimits = limitsValid && hasLimitsChanged && !isSavingLimits;

  const handleSaveLimits = () => {
    if (!limitsValid) return;
    onSaveLimits({
      requests_per_second: parsedRps,
      requests_per_day: parsedRpd,
      concurrent_requests: parsedConcurrent,
    });
  };

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      {showBackButton ? (
        <PageHeader
          title={t('settings.project.title')}
          leading={
            <Button
              variant="ghost"
              size="iconSm"
              onPress={onBack}
              accessibilityLabel={t('apiKeys.back')}>
              <Ionicons name="arrow-back" size={designTokens.icon.nav} color={colors.ink} />
            </Button>
          }
          trailing={
            <Button
              variant="primary"
              size="icon"
              shape="circle"
              onPress={onCreateProject}
              accessibilityLabel={t('settings.project.newProject')}
              style={{ width: 36, height: 36 }}>
              <Ionicons name="add" size={designTokens.icon.nav} color={colors.surface} />
            </Button>
          }
        />
      ) : null}

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          {!showBackButton ? <Heading tone="title">{t('settings.project.title')}</Heading> : null}

          <Stack gap="xs">
            <Text intent="eyebrow">{t('settings.project.scopeEyebrow')}</Text>
            <Text intent="body">{t('settings.project.subtitle')}</Text>
          </Stack>

          <Card size="sm">
            <Stack gap="md">
              <Stack gap="xs">
                <Text intent="bodyStrong">{t('settings.project.accountsLabel')}</Text>
                <Stack direction="row" wrap="wrap" gap="sm">
                  {accounts.length === 0 ? (
                    <Text intent="caption">{t('settings.project.noAccounts')}</Text>
                  ) : (
                    accounts.map((account) => (
                      <Button
                        key={account.id}
                        variant={account.id === selectedAccountId ? 'brandSoft' : 'neutral'}
                        size="sm"
                        onPress={() => onSelectAccount(account.id)}
                        accessibilityLabel={t('settings.project.selectAccount', {
                          account: account.billing_identity,
                        })}>
                        {account.billing_identity}
                      </Button>
                    ))
                  )}
                </Stack>
              </Stack>

              <Divider tone="muted" />

              <Stack gap="xs">
                <Text intent="bodyStrong">{t('settings.project.projectsLabel')}</Text>
                <Stack direction="row" wrap="wrap" gap="sm">
                  {projects.length === 0 ? (
                    <Text intent="caption">{t('settings.project.noProjects')}</Text>
                  ) : (
                    projects.map((item) => (
                      <Button
                        key={item.id}
                        variant={item.id === selectedProjectId ? 'brandSoft' : 'neutral'}
                        size="sm"
                        onPress={() => onSelectProject(item.id)}
                        accessibilityLabel={t('settings.project.selectProject', {
                          project: item.name,
                        })}>
                        {item.name}
                      </Button>
                    ))
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={onCreateProject}
                    accessibilityLabel={t('settings.project.newProject')}>
                    {t('settings.project.newProject')}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Card>

          {isLoading ? (
            <Card size="md">
              <EmptyState title={t('settings.project.loading')} />
            </Card>
          ) : null}

          {!isLoading && project ? (
            <>
              <SectionCard
                title={t('settings.project.detailsSection')}
                description={t('settings.project.detailsDescription')}>
                <Stack gap="md">
                  <Stack gap="xs">
                    <Text intent="caption">{t('settings.project.nameLabel')}</Text>
                    <TextField
                      value={nameDraft}
                      onChangeText={setNameDraft}
                      placeholder={t('settings.project.namePlaceholder')}
                      editable={!isSavingDetails}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </Stack>
                  <Stack gap="xs">
                    <Text intent="caption">{t('settings.project.planLabel')}</Text>
                    <TextField
                      value={planDraft}
                      onChangeText={setPlanDraft}
                      placeholder={t('settings.project.planPlaceholder')}
                      editable={!isSavingDetails}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </Stack>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => onSaveDetails({ name: trimmedName, billingPlan: trimmedPlan })}
                    disabled={!canSaveDetails}
                    style={{ alignSelf: 'flex-start' }}>
                    {isSavingDetails
                      ? t('settings.project.detailsSaving')
                      : t('settings.project.detailsSave')}
                  </Button>
                </Stack>
              </SectionCard>

              <SectionCard
                title={t('settings.project.modelsSection')}
                description={t('settings.project.modelsDescription')}>
                <Stack gap="md">
                  {models.length === 0 ? (
                    <Text intent="caption">{t('settings.project.modelsEmpty')}</Text>
                  ) : (
                    <Stack direction="row" wrap="wrap" gap="sm">
                      {models.map((model) => (
                        <Chip
                          key={model}
                          onRemove={() => onRemoveModel(model)}
                          removeAccessibilityLabel={t('settings.project.modelRemove', {
                            name: model,
                          })}
                          disabled={isSavingModels}>
                          {model}
                        </Chip>
                      ))}
                    </Stack>
                  )}

                  <Stack direction="row" gap="sm" align="center">
                    <Div style={{ flex: 1 }}>
                      <TextField
                        value={newModel}
                        onChangeText={setNewModel}
                        placeholder={t('settings.project.modelAddPlaceholder')}
                        editable={!isSavingModels}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onSubmitEditing={handleAddModel}
                      />
                    </Div>
                    <Button
                      variant="neutral"
                      size="sm"
                      onPress={handleAddModel}
                      disabled={!trimmedNewModel || isSavingModels}>
                      {t('settings.project.modelAdd')}
                    </Button>
                  </Stack>
                </Stack>
              </SectionCard>

              <SectionCard
                title={t('settings.project.limitsSection')}
                description={t('settings.project.limitsDescription')}>
                <Stack gap="md">
                  <Stack gap="xs">
                    <Text intent="caption">{t('settings.project.limitRps')}</Text>
                    <TextField
                      value={rpsDraft}
                      onChangeText={setRpsDraft}
                      editable={!isSavingLimits}
                      keyboardType="number-pad"
                      autoCorrect={false}
                    />
                  </Stack>
                  <Stack gap="xs">
                    <Text intent="caption">{t('settings.project.limitRpd')}</Text>
                    <TextField
                      value={rpdDraft}
                      onChangeText={setRpdDraft}
                      editable={!isSavingLimits}
                      keyboardType="number-pad"
                      autoCorrect={false}
                    />
                  </Stack>
                  <Stack gap="xs">
                    <Text intent="caption">{t('settings.project.limitConcurrent')}</Text>
                    <TextField
                      value={concurrentDraft}
                      onChangeText={setConcurrentDraft}
                      editable={!isSavingLimits}
                      keyboardType="number-pad"
                      autoCorrect={false}
                    />
                  </Stack>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleSaveLimits}
                    disabled={!canSaveLimits}
                    style={{ alignSelf: 'flex-start' }}>
                    {isSavingLimits
                      ? t('settings.project.limitsSaving')
                      : t('settings.project.limitsSave')}
                  </Button>
                </Stack>
              </SectionCard>

              <Stack direction="row" gap="md" wrap="wrap">
                <Text intent="caption">
                  {t('settings.project.createdOn', { date: formatDate(project.created_at) })}
                </Text>
                <Text intent="caption">
                  {t('settings.project.updatedOn', { date: formatDate(project.updated_at) })}
                </Text>
              </Stack>

              <SectionCard
                tone="danger"
                title={t('settings.project.dangerSection')}
                description={t('settings.project.dangerDescription')}>
                <Stack align="start">
                  <Button
                    variant="neutral"
                    size="sm"
                    onPress={onDeleteProject}
                    style={{ alignSelf: 'flex-start', borderColor: colors.error, borderWidth: 1 }}>
                    <Text intent="body" style={{ color: colors.error }}>
                      {t('settings.project.deleteProject')}
                    </Text>
                  </Button>
                </Stack>
              </SectionCard>
            </>
          ) : null}

          {!isLoading && !project ? (
            <Card size="md">
              <EmptyState
                icon={<Ionicons name="folder-open-outline" size={28} color={colors.subtle} />}
                title={t('settings.project.noProjects')}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={onCreateProject}
                    accessibilityLabel={t('settings.project.newProject')}>
                    {t('settings.project.newProject')}
                  </Button>
                }
              />
            </Card>
          ) : null}
        </Stack>
      </Scroll>
    </Div>
  );
}
