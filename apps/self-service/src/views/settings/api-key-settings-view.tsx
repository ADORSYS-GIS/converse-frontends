import React, { useEffect, useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Badge,
  Button,
  Card,
  Callout,
  designTokens,
  Div,
  Divider,
  EmptyState,
  Heading,
  Icon as Feather,
  KeyValue,
  PageHeader,
  Scroll,
  SectionCard,
  Skeleton,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import type { Account, ApiKey, Project } from '@lightbridge/hooks';
import { asTrimmedString, asTrimmedStringOrNull } from '@lightbridge/hooks/wire-safety';
import { ExpirySelector } from '../../components/expiry-selector';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { expiresAtToDateOnly, getDerivedStatus, validateExpiresAt } from '../../lib/api-key-expiry';
import { formatDate, formatNullableDate } from '../api-keys-list-view';

export type ApiKeyDetailsInput = {
  name: string;
  /** A resolved, in-range ISO datetime -- every key this app writes back now carries a real
   * expiration, so there is no `null` "clear the expiration" case any more. */
  expiresAt: string;
};

type ApiKeySettingsViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  accounts?: Account[];
  projects?: Project[];
  apiKeys?: ApiKey[];
  selectedAccountId?: string;
  selectedProjectId?: string;
  selectedKeyId?: string;
  apiKey?: ApiKey;
  isLoading?: boolean;
  onSelectAccount: (id: string) => void;
  onSelectProject: (id: string) => void;
  onSelectKey: (id: string) => void;
  onSaveDetails: (input: ApiKeyDetailsInput) => void;
  isSavingDetails?: boolean;
  canUpdate?: boolean;
  canRevoke?: boolean;
  canDelete?: boolean;
  onRevoke: () => void;
  onDelete: () => void;
  /** Navigates to the API Keys list screen — rotation lives there, not duplicated here. */
  onGoToApiKeys: () => void;
};

export function ApiKeySettingsView({
  showBackButton = true,
  onBack,
  accounts = [],
  projects = [],
  apiKeys = [],
  selectedAccountId,
  selectedProjectId,
  selectedKeyId,
  apiKey,
  isLoading = false,
  onSelectAccount,
  onSelectProject,
  onSelectKey,
  onSaveDetails,
  isSavingDetails = false,
  canUpdate = true,
  canRevoke = true,
  canDelete = true,
  onRevoke,
  onDelete,
  onGoToApiKeys,
}: Readonly<ApiKeySettingsViewProps>) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const dateLocale = i18n.language;

  // `apiKey?.name ?? ''` alone only guards `null`/`undefined` -- a present-but-non-string value
  // from the generated RPC client's unchecked `as ApiKey` cast would sail straight through and
  // crash `nameDraft.trim()` below (`TypeError: ....trim is not a function`), the same production
  // incident `@lightbridge/hooks`' `asTrimmedString` was written to prevent -- see its doc
  // comment and `AccountSettingsView`'s identical guard on `defaultQuota`.
  const [nameDraft, setNameDraft] = useState(asTrimmedString(apiKey?.name));
  // Placeholder only -- `ExpirySelector` below (keyed on `apiKey.id`) reports its own seeded
  // resolution through `onChange` (= `setExpiresAtDraft`) before the user can interact, same
  // ordering guarantee the effect below relies on. `asTrimmedStringOrNull` guards this wire-sourced
  // field the same way `asTrimmedString` guards `apiKey?.name` just above -- a present-but-wrong-
  // typed `expiresAt` from the RPC boundary must not sail through as a truthy non-string value.
  const [expiresAtDraft, setExpiresAtDraft] = useState<string | undefined>(
    asTrimmedStringOrNull(apiKey?.expiresAt) ?? undefined
  );

  useEffect(() => {
    setNameDraft(asTrimmedString(apiKey?.name));
    // `expiresAtDraft` is deliberately NOT reset here. `ExpirySelector` below is remounted via
    // `key={apiKey.id}` whenever the selected key changes, and its own mount effect reports the
    // freshly-seeded resolved value through `onChange` (= `setExpiresAtDraft`) -- React fires a
    // child's mount effect before this parent effect in the same commit, so resetting it here
    // too would win the race and clobber that resolved value back to the raw, unnormalized
    // `apiKey.expiresAt` (observed as a real bug: `2026-12-31T00:00:00Z` overwriting the
    // correctly-resolved `2026-12-31T00:00:00.000Z` on every render).
  }, [apiKey]);

  const trimmedName = nameDraft.trim();
  const expirationValid = expiresAtDraft !== undefined;
  // Compare at the same `YYYY-MM-DD` (calendar-day) granularity `ExpirySelector`'s "Custom"
  // picker edits, not the raw ISO strings: a preset-derived `apiKey.expiresAt` carries a
  // non-midnight time-of-day, and re-seeding "Custom" from it always resolves back to that same
  // calendar day at UTC midnight (see `ExpirySelector`'s `initialPresetFor`) -- comparing full
  // ISO strings would misreport "changed" on first render even though the user touched nothing.
  const expiryChanged =
    expiresAtToDateOnly(expiresAtDraft) !== expiresAtToDateOnly(apiKey?.expiresAt);
  const hasDetailsChanged = !!apiKey && (trimmedName !== apiKey.name || expiryChanged);
  const canSaveDetails =
    hasDetailsChanged && trimmedName.length > 0 && expirationValid && !isSavingDetails;

  const handleSaveDetails = () => {
    if (expiresAtDraft === undefined) return;
    // Only re-validate the range when the user actually changed the expiry. `ExpirySelector`
    // already keeps `expiresAtDraft` within range for any value the user actively picked (see
    // its `resolve` doc comment), so this is defense-in-depth against a value arriving some
    // other way -- not the primary gate. Deliberately does NOT gate on an *unchanged* expiry: a
    // legacy key persisted before every key required an expiration (or one that has since
    // expired) can carry a value outside today's allowed range, and a pure name edit on that key
    // must still be saveable without being forced to first fix an expiry nobody asked to touch.
    if (expiryChanged && !validateExpiresAt(expiresAtDraft).ok) return;
    onSaveDetails({ name: trimmedName, expiresAt: expiresAtDraft });
  };

  const isActive = apiKey?.status === 'active';
  const derivedStatus = apiKey ? getDerivedStatus(apiKey) : 'active';

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      {showBackButton ? (
        <PageHeader
          title={t('settings.apiKey.title')}
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
        />
      ) : null}

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          {!showBackButton ? (
            <Stack gap="xs">
              <Heading tone="title">{t('settings.apiKey.title')}</Heading>
              <Text intent="body">{t('settings.apiKey.subtitle')}</Text>
            </Stack>
          ) : null}

          <Card size="sm">
            <Stack gap="md">
              <Stack gap="xs">
                <Text intent="bodyStrong">{t('settings.apiKey.accountsLabel')}</Text>
                <Stack direction="row" wrap="wrap" gap="sm">
                  {accounts.length === 0 ? (
                    <Text intent="caption">{t('settings.apiKey.noAccounts')}</Text>
                  ) : (
                    accounts.map((account) => (
                      <Button
                        key={account.id}
                        variant={account.id === selectedAccountId ? 'primary' : 'neutral'}
                        size="sm"
                        onPress={() => onSelectAccount(account.id)}
                        accessibilityLabel={t('settings.apiKey.selectAccount', {
                          account: account.id,
                        })}>
                        {account.id}
                      </Button>
                    ))
                  )}
                </Stack>
              </Stack>

              <Divider tone="muted" />

              <Stack gap="xs">
                <Text intent="bodyStrong">{t('settings.apiKey.projectsLabel')}</Text>
                <Stack direction="row" wrap="wrap" gap="sm">
                  {projects.length === 0 ? (
                    <Text intent="caption">{t('settings.apiKey.noProjects')}</Text>
                  ) : (
                    projects.map((project) => (
                      <Button
                        key={project.id}
                        variant={project.id === selectedProjectId ? 'primary' : 'neutral'}
                        size="sm"
                        onPress={() => onSelectProject(project.id)}
                        accessibilityLabel={t('settings.apiKey.selectProject', {
                          project: project.name,
                        })}>
                        {project.name}
                      </Button>
                    ))
                  )}
                </Stack>
              </Stack>

              <Divider tone="muted" />

              <Stack gap="xs">
                <Text intent="bodyStrong">{t('settings.apiKey.keysLabel')}</Text>
                <Stack direction="row" wrap="wrap" gap="sm">
                  {apiKeys.length === 0 ? (
                    <Text intent="caption">{t('settings.apiKey.noKeys')}</Text>
                  ) : (
                    apiKeys.map((key) => (
                      <Button
                        key={key.id}
                        variant={key.id === selectedKeyId ? 'primary' : 'neutral'}
                        size="sm"
                        onPress={() => onSelectKey(key.id)}
                        accessibilityLabel={t('settings.apiKey.selectKey', { name: key.name })}>
                        {key.name}
                      </Button>
                    ))
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Card>

          {isLoading ? (
            <Card size="md">
              <Stack gap="md">
                <Skeleton width="40%" height={12} />
                <Skeleton height={40} />
                <Skeleton width="30%" height={12} />
                <Skeleton height={40} />
              </Stack>
            </Card>
          ) : null}

          {!isLoading && apiKey ? (
            <>
              <Stack direction="row" align="center" gap="sm">
                <Heading tone="title">{apiKey.name}</Heading>
                <Badge
                  tone={derivedStatus === 'active' ? 'success' : 'error'}
                  accessibilityLabel={t(`apiKeys.status.${derivedStatus}`)}>
                  {t(`apiKeys.status.${derivedStatus}`)}
                </Badge>
              </Stack>

              {canUpdate ? (
                <SectionCard
                  title={t('settings.apiKey.detailsSection')}
                  description={t('settings.apiKey.detailsDescription')}>
                  <Stack gap="md">
                    <Stack gap="xs">
                      <Text intent="caption">{t('settings.apiKey.nameLabel')}</Text>
                      <TextField
                        value={nameDraft}
                        onChangeText={setNameDraft}
                        placeholder={t('settings.apiKey.namePlaceholder')}
                        editable={!isSavingDetails}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </Stack>
                    <ExpirySelector
                      key={apiKey.id}
                      label={t('apiKeys.expiry.label')}
                      initialValue={asTrimmedStringOrNull(apiKey.expiresAt)}
                      onChange={setExpiresAtDraft}
                      disabled={isSavingDetails}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleSaveDetails}
                      disabled={!canSaveDetails}
                      style={{ alignSelf: 'flex-start' }}>
                      {isSavingDetails
                        ? t('settings.apiKey.detailsSaving')
                        : t('settings.apiKey.detailsSave')}
                    </Button>
                  </Stack>
                </SectionCard>
              ) : null}

              <SectionCard
                title={t('settings.apiKey.metadataSection')}
                description={t('settings.apiKey.metadataDescription')}>
                <Stack gap="sm">
                  <Divider tone="muted" />
                  <KeyValue
                    label={t('settings.apiKey.statusLabel')}
                    value={t(`apiKeys.status.${derivedStatus}`)}
                  />
                  <KeyValue label={t('settings.apiKey.keyPrefixLabel')} value={apiKey.keyPrefix} />
                  <KeyValue
                    label={t('settings.apiKey.billingPlanLabel')}
                    value={apiKey.billingPlan}
                  />
                  <KeyValue
                    label={t('settings.apiKey.lastUsedLabel')}
                    value={
                      apiKey.lastUsedAt
                        ? (formatNullableDate(apiKey.lastUsedAt, dateLocale) ?? '')
                        : t('apiKeys.neverUsed')
                    }
                  />
                  <KeyValue
                    label={t('settings.apiKey.lastIpLabel')}
                    value={apiKey.lastIp ?? t('settings.apiKey.noLastIp')}
                  />
                  <KeyValue
                    label={t('settings.apiKey.createdLabel')}
                    value={formatDate(apiKey.createdAt, dateLocale)}
                  />
                  {apiKey.revokedAt ? (
                    <KeyValue
                      label={t('settings.apiKey.revokedLabel')}
                      value={formatDate(apiKey.revokedAt, dateLocale)}
                    />
                  ) : null}
                </Stack>
              </SectionCard>

              <SectionCard
                tone="muted"
                title={t('settings.apiKey.rotationSection')}
                description={t('settings.apiKey.rotationDescription')}>
                <Stack gap="sm" align="start">
                  <Text intent="caption">{t('settings.apiKey.rotationNote')}</Text>
                  <Button
                    variant="neutral"
                    size="sm"
                    onPress={onGoToApiKeys}
                    style={{ alignSelf: 'flex-start' }}>
                    {t('settings.apiKey.goToApiKeys')}
                  </Button>
                </Stack>
              </SectionCard>

              {canRevoke || canDelete ? (
                <SectionCard
                  tone="danger"
                  title={t('settings.apiKey.dangerSection')}
                  description={t('settings.apiKey.dangerDescription')}>
                  <Stack gap="sm" align="start">
                    {!isActive ? (
                      <Callout tone="warning">{t('settings.apiKey.revokedNotice')}</Callout>
                    ) : derivedStatus === 'expired' ? (
                      <Callout tone="error">{t('settings.apiKey.expiredNotice')}</Callout>
                    ) : null}
                    <Stack direction="row" gap="sm" wrap="wrap">
                      {canRevoke ? (
                        <Button
                          variant="neutral"
                          size="sm"
                          disabled={!isActive}
                          onPress={onRevoke}
                          textProps={{ style: { color: colors.error } }}
                          accessibilityLabel={t('apiKeys.revokeNamed', { name: apiKey.name })}>
                          {t('apiKeys.revoke')}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onPress={onDelete}
                          accessibilityLabel={t('apiKeys.deleteNamed', { name: apiKey.name })}>
                          {t('apiKeys.delete')}
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </SectionCard>
              ) : null}
            </>
          ) : null}

          {!isLoading && !apiKey ? (
            <Card size="md">
              <EmptyState
                icon={<Feather name="key" size={28} color={colors.subtle} />}
                title={t('settings.apiKey.noKeySelected')}
              />
            </Card>
          ) : null}
        </Stack>
      </Scroll>
    </Div>
  );
}
