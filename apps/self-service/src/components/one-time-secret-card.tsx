import React, { useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { useTranslation } from '@lightbridge/i18n';
import { Button, Card, Div, Icon as Feather, Stack, Text } from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type OneTimeSecretCardProps = {
  secret: string;
  onCopy: (value: string) => void;
  /**
   * OAuth2 token endpoint the backend returns alongside the secret (see
   * `ApiKeySecret.oauth2Url` in `packages/authz-rpc/schema/authz.cstack`), so an
   * external API-key consumer can find `/oauth2/token` at the moment they have
   * their new key in hand. Optional and additive — omit it (or pass an empty/
   * malformed value) and the card renders exactly as it did before this field
   * existed; only a non-empty, well-formed http(s) URL is ever shown.
   */
  oauth2Url?: string | null;
};

/**
 * Returns `url` trimmed when it is a well-formed absolute http(s) URL,
 * otherwise `null`. Anything else (missing, empty, unparsable, non-http(s)
 * scheme) degrades to "not shown" rather than risking a broken link.
 *
 * `url`'s declared type (`string | null | undefined`) is the *TypeScript* contract, not a
 * guarantee about what actually arrives on the wire: this value crosses an `unknown`-typed RPC
 * boundary (`packages/authz-rpc/generated/src/client.ts`'s `createApiKey` does
 * `.then((value) => reviveDecimalFields(value, 'ApiKeySecret') as ApiKeySecret)` — an unchecked
 * cast, not a runtime validation) before it ever reaches this function. `url?.trim()` alone only
 * guards `null`/`undefined`; a present-but-non-string value (e.g. an object, from a future schema
 * change or a client/server version mismatch on this field) still has `.trim` called on it and
 * throws `TypeError: url.trim is not a function` — which crashes this component's `useMemo`
 * and, with no error boundary above it in this app, blanks the entire screen. The explicit
 * `typeof` check makes the wire's honesty, not the type annotation, the thing this function
 * actually trusts.
 */
function normalizeOauth2Url(url: string | null | undefined): string | null {
  if (typeof url !== 'string') {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function OneTimeSecretCard({ secret, onCopy, oauth2Url }: Readonly<OneTimeSecretCardProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const resolvedOauth2Url = useMemo(() => normalizeOauth2Url(oauth2Url), [oauth2Url]);

  // Flip the button back from "Copied" to "Copy" after a moment, with automatic
  // cleanup — replaces the previous useRef + setTimeout bookkeeping.
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = () => {
    // The web clipboard write now goes through useCopyToClipboard; onCopy is
    // retained so callers that wire the platform writer / observe copies keep
    // working (the existing test asserts it is called).
    void copyToClipboard(secret);
    onCopy(secret);
    setCopied(true);
  };

  return (
    <Card size="md">
      <Stack gap="md">
        <Text intent="caption">{t('apiKeys.yourNewKey')}</Text>
        <Div
          tone="muted"
          pad="md"
          rounded="xl"
          style={{ borderWidth: 1, borderColor: colors.border }}>
          <Text intent="bodyStrong" selectable>
            {secret}
          </Text>
        </Div>
        {resolvedOauth2Url ? (
          <Stack gap="xs">
            <Text intent="caption">{t('apiKeys.oauth2UrlLabel')}</Text>
            <Div
              tone="muted"
              pad="md"
              rounded="xl"
              style={{ borderWidth: 1, borderColor: colors.border }}>
              <Text intent="body" selectable>
                {resolvedOauth2Url}
              </Text>
            </Div>
          </Stack>
        ) : null}
        <Button variant="neutral" onPress={handleCopy} width="full">
          <Stack direction="row" align="center" gap="xs">
            <Feather name={copied ? 'check' : 'copy'} size={18} color={colors.primary} />
            <Text intent="link">{copied ? t('apiKeys.copied') : t('apiKeys.copy')}</Text>
          </Stack>
        </Button>
      </Stack>
    </Card>
  );
}
