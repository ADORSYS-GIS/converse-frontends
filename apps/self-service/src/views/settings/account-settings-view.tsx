import React, { useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Badge,
  Button,
  Card,
  designTokens,
  Div,
  Divider,
  Heading,
  Icon as Feather,
  KeyValue,
  PageHeader,
  Scroll,
  SectionCard,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import type { Account } from '@lightbridge/hooks';
import { asTrimmedString } from '@lightbridge/hooks/wire-safety';
import { EntityPickerField, toAccountPickerOptions } from '../../components/entity-picker-field';
import { useThemeColors } from '../../hooks/use-theme-colors';

type AccountSettingsViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  accounts?: Account[];
  selectedAccountId?: string;
  isLoading?: boolean;
  onSelectAccount: (id: string) => void;
  /** Opens the searchable account picker sheet — owned by the screen (see `usePickerSheet`). */
  onOpenAccountPicker: () => void;
  defaultQuota: string;
  onSaveDefaultQuota: (value: string) => void;
  isSavingDefaultQuota?: boolean;
  authIssuer: string;
  authUserLabel: string;
  status?: 'active' | 'suspended';
  canUpdate?: boolean;
  canDelete?: boolean;
  canDisable?: boolean;
  onDeleteAccount: () => void;
  onSuspendAccount: () => void;
  onEnableAccount: () => void;
  isChangingStatus?: boolean;
  statusError?: string | null;
};

export function AccountSettingsView({
  showBackButton = true,
  onBack,
  accounts = [],
  selectedAccountId,
  isLoading = false,
  onSelectAccount,
  onOpenAccountPicker,
  defaultQuota,
  onSaveDefaultQuota,
  isSavingDefaultQuota = false,
  authIssuer,
  authUserLabel,
  status = 'active',
  canUpdate = true,
  canDelete = true,
  canDisable = true,
  onDeleteAccount,
  onSuspendAccount,
  onEnableAccount,
  isChangingStatus = false,
  statusError = null,
}: Readonly<AccountSettingsViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  // `defaultQuota`'s declared type (`string`) is the *TypeScript* contract, not a guarantee about
  // what actually arrives here: this value crosses the generated RPC client's unchecked `as
  // Account` cast (`packages/authz-rpc/generated/src/client.ts`) on its way from
  // `selectedAccount?.defaultQuota` in `account-settings-screen.tsx`. A present-but-non-string
  // value (e.g. from a server bug or a client/server schema version skew) would otherwise reach
  // `.trim()` below and throw `TypeError: ....trim is not a function` -- the exact production
  // incident this normalization exists to prevent (see `@lightbridge/hooks`' `asTrimmedString`
  // doc comment for the sibling incident this pattern was first fixed for, in
  // `OneTimeSecretCard`). Normalizing once, at the prop boundary, means every downstream use of
  // `defaultQuota` in this component is already a safe, trimmed string.
  const safeDefaultQuota = asTrimmedString(defaultQuota);
  const [defaultQuotaDraft, setDefaultQuotaDraft] = useState(safeDefaultQuota);

  // Reset the draft when the selected account changes, computed during render instead of in an
  // effect -- see `project-settings-view.tsx`'s `resetKey` for the general shape and why
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  // Keyed on `selectedAccountId`, not `safeDefaultQuota` itself: two different accounts that
  // happen to share the same quota value would otherwise fail to reset the draft on switch, since
  // a `useEffect(() => {...}, [safeDefaultQuota])` only re-fires when the *value* changes.
  const [resetKey, setResetKey] = useState(selectedAccountId);
  if (selectedAccountId !== resetKey) {
    setResetKey(selectedAccountId);
    setDefaultQuotaDraft(safeDefaultQuota);
  }

  const trimmedDraft = asTrimmedString(defaultQuotaDraft);
  const hasDefaultQuotaChanged = trimmedDraft !== safeDefaultQuota;
  const canSaveDefaultQuota = hasDefaultQuotaChanged && !isSavingDefaultQuota;

  const accountOptions = toAccountPickerOptions(accounts);

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      {showBackButton ? (
        <PageHeader
          title={t('settings.account.title')}
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
            <Stack direction="row" align="center" justify="between" width="full">
              <Stack direction="row" align="center" gap="sm">
                <Heading tone="title">{t('settings.account.title')}</Heading>
                <Badge tone={status === 'suspended' ? 'warning' : 'success'}>
                  {status === 'suspended'
                    ? t('settings.account.statusSuspended')
                    : t('settings.account.statusActive')}
                </Badge>
              </Stack>
            </Stack>
          ) : (
            <Badge tone={status === 'suspended' ? 'warning' : 'success'}>
              {status === 'suspended'
                ? t('settings.account.statusSuspended')
                : t('settings.account.statusActive')}
            </Badge>
          )}

          <Card size="sm">
            <EntityPickerField
              label={t('settings.account.accountsLabel')}
              options={accountOptions}
              selectedId={selectedAccountId}
              onSelect={onSelectAccount}
              onOpenPicker={onOpenAccountPicker}
              emptyLabel={t('settings.account.noAccounts')}
              placeholderLabel={t('picker.selectAccount')}
              triggerAccessibilityLabel={t('picker.selectAccount')}
              optionAccessibilityLabel={(option) =>
                t('settings.account.selectAccount', { account: option.label })
              }
              isLoading={isLoading}
            />
          </Card>

          {canUpdate ? (
            <SectionCard
              title={t('settings.account.defaultQuotaSection')}
              description={t('settings.account.defaultQuotaDescription')}>
              <Stack gap="md">
                <TextField
                  value={defaultQuotaDraft}
                  onChangeText={setDefaultQuotaDraft}
                  editable={!isSavingDefaultQuota}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => onSaveDefaultQuota(trimmedDraft)}
                  disabled={!canSaveDefaultQuota}
                  style={{ alignSelf: 'flex-start' }}>
                  {isSavingDefaultQuota
                    ? t('settings.account.defaultQuotaSaving')
                    : t('settings.account.defaultQuotaSave')}
                </Button>
              </Stack>
            </SectionCard>
          ) : null}

          <SectionCard
            title={t('settings.account.authSection')}
            description={t('settings.account.authDescription')}>
            <Stack gap="sm">
              <Divider tone="muted" />
              <KeyValue label={t('settings.account.authUserLabel')} value={authUserLabel} />
              <KeyValue label={t('settings.account.authIssuerLabel')} value={authIssuer} />
            </Stack>
          </SectionCard>

          <SectionCard
            tone="muted"
            title={t('settings.account.policiesSection')}
            description={t('settings.account.policiesUnsupported')}
          />

          {canDisable ? (
            <SectionCard
              tone={status === 'suspended' ? 'danger' : 'muted'}
              title={t('settings.account.suspendSection')}
              description={t('settings.account.suspendDescription')}>
              <Stack gap="sm" align="start">
                <Button
                  variant={status === 'suspended' ? 'neutral' : 'danger'}
                  size="sm"
                  disabled={isChangingStatus}
                  onPress={status === 'suspended' ? onEnableAccount : onSuspendAccount}
                  style={{ alignSelf: 'flex-start' }}>
                  {status === 'suspended'
                    ? isChangingStatus
                      ? t('settings.account.enabling')
                      : t('settings.account.enableAccount')
                    : isChangingStatus
                      ? t('settings.account.suspending')
                      : t('settings.account.suspendAccount')}
                </Button>
                {statusError ? (
                  <Text intent="caption" style={{ color: colors.error }}>
                    {statusError}
                  </Text>
                ) : null}
              </Stack>
            </SectionCard>
          ) : null}

          {canDelete ? (
            <SectionCard
              tone="danger"
              title={t('settings.account.dangerSection')}
              description={t('settings.account.dangerDescription')}>
              <Stack align="start">
                <Button
                  variant="danger"
                  size="sm"
                  onPress={onDeleteAccount}
                  style={{ alignSelf: 'flex-start' }}>
                  {t('settings.account.deleteAccount')}
                </Button>
              </Stack>
            </SectionCard>
          ) : null}
        </Stack>
      </Scroll>
    </Div>
  );
}
