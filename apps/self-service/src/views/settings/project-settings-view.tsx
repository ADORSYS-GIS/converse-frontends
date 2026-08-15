import React, { useEffect, useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Badge,
  Button,
  Card,
  Chip,
  designTokens,
  Div,
  Divider,
  EmptyState,
  Heading,
  Icon as Feather,
  PageHeader,
  Scroll,
  SectionCard,
  Skeleton,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import type { Account, Project, ProjectMember } from '@lightbridge/hooks';
import { AllowlistEnforcementNotice } from '../../components/allowlist-enforcement-notice';
import {
  EntityPickerField,
  toAccountPickerOptions,
  toProjectPickerOptions,
} from '../../components/entity-picker-field';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { formatDate } from '../api-keys-list-view';

export type ProjectDetailsInput = {
  name: string;
  billingPlan: string;
};

/**
 * `Project.defaultLimits` is an opaque `JsonValue` blob on the wire (not a
 * cratestack model, so its keys were never part of the camelCase migration) —
 * this is the shape the UI reads/writes inside that blob.
 */
export type ProjectDefaultLimits = {
  requests_per_second?: number | null;
  requests_per_day?: number | null;
  concurrent_requests?: number | null;
};

/** Narrows the opaque `defaultLimits` JsonValue down to the shape this view understands. */
const asDefaultLimits = (value: Project['defaultLimits'] | undefined): ProjectDefaultLimits =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ProjectDefaultLimits)
    : {};

/** Narrows the opaque `allowedModels` JsonValue down to a plain model-id list. */
const asAllowedModels = (value: Project['allowedModels']): string[] =>
  Array.isArray(value) ? (value as string[]) : [];

type ProjectSettingsViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  accounts?: Account[];
  projects?: Project[];
  selectedAccountId?: string;
  selectedProjectId?: string;
  project?: Project;
  isLoading?: boolean;
  onSelectAccount: (id: string) => void;
  onSelectProject: (id: string) => void;
  /** Opens the searchable account/project picker sheet — owned by the screen (`usePickerSheet`). */
  onOpenAccountPicker: () => void;
  onOpenProjectPicker: () => void;
  onCreateProject: () => void;
  onSaveDetails: (input: ProjectDetailsInput) => void;
  isSavingDetails?: boolean;
  onAddModel: (model: string) => void;
  onRemoveModel: (model: string) => void;
  isSavingModels?: boolean;
  onSaveLimits: (limits: ProjectDefaultLimits) => void;
  isSavingLimits?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canDisable?: boolean;
  onDeleteProject: () => void;
  onSuspendProject: () => void;
  onEnableProject: () => void;
  isChangingStatus?: boolean;
  statusError?: string | null;
  onSetDefaultProject: () => void;
  isSettingDefault?: boolean;
  setDefaultError?: string | null;
  /** Roster rows for the selected project. Always empty for a default project — see below. */
  members?: ProjectMember[];
  isLoadingMembers?: boolean;
  onAddMember: (accountId: string, role: 'lead' | 'member') => void;
  onRemoveMember: (accountId: string) => void;
  onSetMemberRole: (accountId: string, role: 'lead' | 'member') => void;
  onSetMemberQuotaTier: (accountId: string, quotaTier: string) => void;
  isSavingMembers?: boolean;
  /**
   * Coarse `project:member` capability only. The server additionally requires the caller to own
   * the project's account or hold `role: 'lead'`, so a caller who passes this can still get a
   * 403 — which is what `memberError` surfaces.
   */
  canManageMembers?: boolean;
  memberError?: string | null;
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
  onOpenAccountPicker,
  onOpenProjectPicker,
  onCreateProject,
  onSaveDetails,
  isSavingDetails = false,
  onAddModel,
  onRemoveModel,
  isSavingModels = false,
  onSaveLimits,
  isSavingLimits = false,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  canDisable = true,
  onDeleteProject,
  onSuspendProject,
  onEnableProject,
  isChangingStatus = false,
  statusError = null,
  onSetDefaultProject,
  isSettingDefault = false,
  setDefaultError = null,
  members = [],
  isLoadingMembers = false,
  onAddMember,
  onRemoveMember,
  onSetMemberRole,
  onSetMemberQuotaTier,
  isSavingMembers = false,
  canManageMembers = true,
  memberError = null,
}: Readonly<ProjectSettingsViewProps>) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const dateLocale = i18n.language;

  const accountOptions = toAccountPickerOptions(accounts);
  const projectOptions = toProjectPickerOptions(projects, selectedProjectId, colors);

  const projectLimits = asDefaultLimits(project?.defaultLimits);

  const [nameDraft, setNameDraft] = useState(project?.name ?? '');
  const [planDraft, setPlanDraft] = useState(project?.billingPlan ?? '');
  const [newModel, setNewModel] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, string>>({});
  const [rpsDraft, setRpsDraft] = useState(limitToDraft(projectLimits.requests_per_second));
  const [rpdDraft, setRpdDraft] = useState(limitToDraft(projectLimits.requests_per_day));
  const [concurrentDraft, setConcurrentDraft] = useState(
    limitToDraft(projectLimits.concurrent_requests)
  );

  useEffect(() => {
    const limits = asDefaultLimits(project?.defaultLimits);
    setNameDraft(project?.name ?? '');
    setPlanDraft(project?.billingPlan ?? '');
    setNewModel('');
    setRpsDraft(limitToDraft(limits.requests_per_second));
    setRpdDraft(limitToDraft(limits.requests_per_day));
    setConcurrentDraft(limitToDraft(limits.concurrent_requests));
  }, [project]);

  const trimmedName = nameDraft.trim();
  const trimmedPlan = planDraft.trim();
  const hasDetailsChanged =
    !!project && (trimmedName !== project.name || trimmedPlan !== project.billingPlan);
  const canSaveDetails =
    hasDetailsChanged && trimmedName.length > 0 && trimmedPlan.length > 0 && !isSavingDetails;

  const models = asAllowedModels(project?.allowedModels);
  const trimmedNewModel = newModel.trim();

  const handleAddModel = () => {
    if (!trimmedNewModel || models.includes(trimmedNewModel)) return;
    onAddModel(trimmedNewModel);
    setNewModel('');
  };

  const trimmedNewMemberId = newMemberId.trim();

  const handleAddMember = () => {
    if (!trimmedNewMemberId) return;
    // New members join as plain members; promotion is a separate, deliberate action.
    onAddMember(trimmedNewMemberId, 'member');
    setNewMemberId('');
  };

  const parsedRps = parseLimitDraft(rpsDraft);
  const parsedRpd = parseLimitDraft(rpdDraft);
  const parsedConcurrent = parseLimitDraft(concurrentDraft);
  const limitsValid =
    parsedRps !== undefined && parsedRpd !== undefined && parsedConcurrent !== undefined;
  const hasLimitsChanged =
    !!project &&
    (parsedRps !== (projectLimits.requests_per_second ?? null) ||
      parsedRpd !== (projectLimits.requests_per_day ?? null) ||
      parsedConcurrent !== (projectLimits.concurrent_requests ?? null));
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
            <Stack direction="row" align="center" gap="sm">
              <Button
                variant="ghost"
                size="iconSm"
                onPress={onBack}
                accessibilityLabel={t('apiKeys.back')}>
                <Feather name="arrow-left" size={designTokens.icon.nav} color={colors.ink} />
              </Button>
              <Text intent="caption">{t('nav.settings')}</Text>
              <Feather name="chevron-right" size={14} color={colors.subtle} />
            </Stack>
          }
          trailing={
            canCreate ? (
              <Button
                variant="primary"
                size="icon"
                shape="circle"
                onPress={onCreateProject}
                accessibilityLabel={t('settings.project.newProject')}
                style={{ width: 36, height: 36 }}>
                <Feather name="plus" size={designTokens.icon.nav} color={colors.surface} />
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          {!showBackButton ? (
            <Stack direction="row" align="center" justify="between" width="full">
              <Stack direction="row" align="center" gap="sm">
                <Heading tone="title">{t('settings.project.title')}</Heading>
                {project ? (
                  <Badge tone={project.status === 'suspended' ? 'warning' : 'success'}>
                    {project.status === 'suspended'
                      ? t('settings.project.statusSuspended')
                      : t('settings.project.statusActive')}
                  </Badge>
                ) : null}
              </Stack>
              {canCreate ? (
                <Button
                  variant="primary"
                  size="icon"
                  shape="circle"
                  onPress={onCreateProject}
                  accessibilityLabel={t('settings.project.newProject')}
                  style={{ width: 36, height: 36 }}>
                  <Feather name="plus" size={designTokens.icon.nav} color={colors.surface} />
                </Button>
              ) : null}
            </Stack>
          ) : project ? (
            <Badge tone={project.status === 'suspended' ? 'warning' : 'success'}>
              {project.status === 'suspended'
                ? t('settings.project.statusSuspended')
                : t('settings.project.statusActive')}
            </Badge>
          ) : null}

          <Card size="sm">
            <Stack gap="md">
              <EntityPickerField
                label={t('settings.project.accountsLabel')}
                options={accountOptions}
                selectedId={selectedAccountId}
                onSelect={onSelectAccount}
                onOpenPicker={onOpenAccountPicker}
                emptyLabel={t('settings.project.noAccounts')}
                placeholderLabel={t('picker.selectAccount')}
                triggerAccessibilityLabel={t('picker.selectAccount')}
                optionAccessibilityLabel={(option) =>
                  t('settings.project.selectAccount', { account: option.label })
                }
                isLoading={isLoading}
              />

              <Divider tone="muted" />

              <EntityPickerField
                label={t('settings.project.projectsLabel')}
                options={projectOptions}
                selectedId={selectedProjectId}
                onSelect={onSelectProject}
                onOpenPicker={onOpenProjectPicker}
                emptyLabel={t('settings.project.noProjects')}
                placeholderLabel={t('picker.selectProject')}
                triggerAccessibilityLabel={t('picker.selectProject')}
                optionAccessibilityLabel={(option) =>
                  t('settings.project.selectProject', { project: option.label })
                }
                isLoading={isLoading}
              />
            </Stack>
          </Card>

          {isLoading ? (
            <Card size="md">
              <Stack gap="md">
                <Skeleton width="40%" height={12} />
                <Skeleton height={40} />
                <Skeleton width="30%" height={12} />
                <Skeleton height={40} />
                <Skeleton width={96} height={36} rounded="xl" />
              </Stack>
            </Card>
          ) : null}

          {!isLoading && project ? (
            <>
              {canUpdate ? (
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
              ) : null}

              {canUpdate ? (
                <AllowlistEnforcementNotice projectId={project.id} models={models} />
              ) : null}

              {canUpdate ? (
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
              ) : null}

              {canUpdate ? (
                <SectionCard
                  title={t('settings.project.limitsSection')}
                  description={t('settings.project.limitsDescription')}>
                  <Stack gap="md">
                    <Stack gap="xs">
                      <Text intent="caption">{t('settings.project.limitRps')}</Text>
                      <TextField
                        value={rpsDraft}
                        onChangeText={setRpsDraft}
                        placeholder={t('settings.project.limitRpsPlaceholder')}
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
                        placeholder={t('settings.project.limitRpdPlaceholder')}
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
                        placeholder={t('settings.project.limitConcurrentPlaceholder')}
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
              ) : null}

              <Stack direction="row" gap="md" wrap="wrap">
                <Text intent="caption">
                  {t('settings.project.createdOn', {
                    date: formatDate(project.createdAt, dateLocale),
                  })}
                </Text>
                <Text intent="caption">
                  {t('settings.project.updatedOn', {
                    date: formatDate(project.updatedAt, dateLocale),
                  })}
                </Text>
              </Stack>

              {canDisable ? (
                <SectionCard
                  tone={project.status === 'suspended' ? 'danger' : 'muted'}
                  title={t('settings.project.suspendSection')}
                  description={t('settings.project.suspendDescription')}>
                  <Stack gap="sm" align="start">
                    <Button
                      variant={project.status === 'suspended' ? 'neutral' : 'danger'}
                      size="sm"
                      disabled={isChangingStatus}
                      onPress={project.status === 'suspended' ? onEnableProject : onSuspendProject}
                      style={{ alignSelf: 'flex-start' }}>
                      {project.status === 'suspended'
                        ? isChangingStatus
                          ? t('settings.project.enabling')
                          : t('settings.project.enableProject')
                        : isChangingStatus
                          ? t('settings.project.suspending')
                          : t('settings.project.suspendProject')}
                    </Button>
                    {statusError ? (
                      <Text intent="caption" style={{ color: colors.error }}>
                        {statusError}
                      </Text>
                    ) : null}
                  </Stack>
                </SectionCard>
              ) : null}

              {canManageMembers ? (
                <SectionCard
                  title={t('settings.project.membersSection')}
                  description={t('settings.project.membersDescription')}>
                  {project?.isDefault ? (
                    <Text intent="caption">{t('settings.project.membersDefaultProject')}</Text>
                  ) : (
                    <Stack gap="md">
                      {isLoadingMembers ? (
                        <Skeleton width={220} height={20} rounded="md" />
                      ) : members.length === 0 ? (
                        <Text intent="caption">{t('settings.project.membersEmpty')}</Text>
                      ) : (
                        <Stack gap="sm">
                          {members.map((member) => {
                            const isLead = member.role === 'lead';
                            const quotaDraft =
                              quotaDrafts[member.accountId] ?? member.quotaTier ?? '';
                            return (
                              <Stack key={member.accountId} gap="xs">
                                <Stack direction="row" align="center" justify="between" gap="sm">
                                  <Text intent="bodyStrong" style={{ flex: 1 }}>
                                    {member.accountId}
                                  </Text>
                                  <Badge tone={isLead ? 'info' : 'neutral'}>
                                    {isLead
                                      ? t('settings.project.memberRoleLead')
                                      : t('settings.project.memberRoleMember')}
                                  </Badge>
                                </Stack>
                                <Stack direction="row" gap="sm" align="center" wrap="wrap">
                                  <Button
                                    variant="neutral"
                                    size="sm"
                                    disabled={isSavingMembers}
                                    onPress={() =>
                                      onSetMemberRole(member.accountId, isLead ? 'member' : 'lead')
                                    }>
                                    {isLead
                                      ? t('settings.project.memberDemote')
                                      : t('settings.project.memberPromote')}
                                  </Button>
                                  <Div style={{ flex: 1, minWidth: 140 }}>
                                    <TextField
                                      value={quotaDraft}
                                      onChangeText={(value) =>
                                        setQuotaDrafts((prev) => ({
                                          ...prev,
                                          [member.accountId]: value,
                                        }))
                                      }
                                      placeholder={t('settings.project.memberQuotaPlaceholder')}
                                      editable={!isSavingMembers}
                                      autoCapitalize="none"
                                      autoCorrect={false}
                                      onSubmitEditing={() =>
                                        onSetMemberQuotaTier(member.accountId, quotaDraft.trim())
                                      }
                                    />
                                  </Div>
                                  <Button
                                    variant="neutral"
                                    size="sm"
                                    disabled={
                                      isSavingMembers ||
                                      quotaDraft.trim() === (member.quotaTier ?? '')
                                    }
                                    onPress={() =>
                                      onSetMemberQuotaTier(member.accountId, quotaDraft.trim())
                                    }>
                                    {t('settings.project.memberQuotaSave')}
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    disabled={isSavingMembers}
                                    onPress={() => onRemoveMember(member.accountId)}
                                    accessibilityLabel={t('settings.project.memberRemove', {
                                      name: member.accountId,
                                    })}>
                                    {t('settings.project.memberRemoveLabel')}
                                  </Button>
                                </Stack>
                              </Stack>
                            );
                          })}
                        </Stack>
                      )}

                      <Stack direction="row" gap="sm" align="center">
                        <Div style={{ flex: 1 }}>
                          <TextField
                            value={newMemberId}
                            onChangeText={setNewMemberId}
                            placeholder={t('settings.project.memberAddPlaceholder')}
                            editable={!isSavingMembers}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onSubmitEditing={handleAddMember}
                          />
                        </Div>
                        <Button
                          variant="neutral"
                          size="sm"
                          onPress={handleAddMember}
                          disabled={!trimmedNewMemberId || isSavingMembers}>
                          {t('settings.project.memberAdd')}
                        </Button>
                      </Stack>
                      {memberError ? (
                        <Text intent="caption" style={{ color: colors.error }}>
                          {memberError}
                        </Text>
                      ) : null}
                    </Stack>
                  )}
                </SectionCard>
              ) : null}

              {canUpdate ? (
                <SectionCard
                  tone="muted"
                  title={t('settings.project.defaultSection')}
                  description={
                    project.isDefault
                      ? t('settings.project.defaultDescriptionCurrent')
                      : t('settings.project.defaultDescription')
                  }>
                  <Stack gap="sm" align="start">
                    {project.isDefault ? (
                      <Badge
                        tone="info"
                        icon={<Feather name="star" size={12} color={colors.accent} />}>
                        {t('settings.project.defaultBadge')}
                      </Badge>
                    ) : (
                      <Button
                        variant="neutral"
                        size="sm"
                        disabled={isSettingDefault}
                        onPress={onSetDefaultProject}
                        style={{ alignSelf: 'flex-start' }}>
                        {isSettingDefault
                          ? t('settings.project.settingDefault')
                          : t('settings.project.setDefault')}
                      </Button>
                    )}
                    {setDefaultError ? (
                      <Text intent="caption" style={{ color: colors.error }}>
                        {setDefaultError}
                      </Text>
                    ) : null}
                  </Stack>
                </SectionCard>
              ) : null}

              {canDelete ? (
                <SectionCard
                  tone="danger"
                  title={t('settings.project.dangerSection')}
                  description={
                    project.isDefault
                      ? t('settings.project.dangerDescriptionDefault')
                      : t('settings.project.dangerDescription')
                  }>
                  <Stack align="start">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={project.isDefault}
                      onPress={onDeleteProject}
                      style={{ alignSelf: 'flex-start' }}>
                      {t('settings.project.deleteProject')}
                    </Button>
                  </Stack>
                </SectionCard>
              ) : null}
            </>
          ) : null}

          {!isLoading && !project ? (
            <Card size="md">
              <EmptyState
                icon={<Feather name="folder" size={28} color={colors.subtle} />}
                title={t('settings.project.noProjects')}
                action={
                  canCreate ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={onCreateProject}
                      accessibilityLabel={t('settings.project.newProject')}>
                      {t('settings.project.newProject')}
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : null}
        </Stack>
      </Scroll>
    </Div>
  );
}
