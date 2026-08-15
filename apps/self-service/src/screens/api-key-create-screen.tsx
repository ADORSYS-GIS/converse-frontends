import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';
import { copyToClipboard } from '@lightbridge/api-native';
import {
  useCreateApiKey,
  useEnsureDefaultAccount,
  useEnsureDefaultProject,
  usePermissions,
} from '@lightbridge/hooks';
import { ApiKeyCreateView } from '../views/api-key-create-view';

/**
 * `createApiKey` is lead/owner-gated for the entire mutation (see the procedure's doc comment in
 * `packages/authz-rpc/schema/authz.cstack`): a caller who holds the coarse `apikey:create`
 * permission but is only a `'member'` on the target project is rejected with a 403, for any plan.
 *
 * The thrown error is a `CratestackRpcError` (see `packages/authz-rpc/generated/src/runtime.ts`),
 * NOT an Axios error — it carries the HTTP status directly on `.status`, not under
 * `.response.status`. `getApiErrorStatus`/`getApiErrorMessage` (`@lightbridge/hooks`) assume the
 * Axios shape and silently return nothing useful here, so this reads `.status`/`.body.message`
 * directly instead of routing through those helpers. Duck-typed rather than `instanceof
 * CratestackRpcError` because `@lightbridge/authz-rpc`'s public index doesn't re-export that
 * class (only the hand-written runtime/codec/client surface).
 *
 * The generated `readErrorBody` only understands cratestack's own `{code, message}` error shape;
 * the RBAC gate that produces this particular 403 emits `{error: "..."}` instead, so
 * `readErrorBody` can't parse it and falls back to a generic `"RPC call returned status 403 with
 * an unrecognized error body"` placeholder — useless for exactly the failure users hit most. The
 * HTTP status survives that fallback intact, so branch on status rather than trusting body text.
 */
function getRpcErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

/**
 * Only recognizes a real `CratestackRpcError.body.message` — never falls back to a raw
 * `Error.message` (e.g. a `CratestackRpcTransportError`'s network-failure text), so an
 * unrecognized/transport failure always renders the polished generic copy instead of a
 * leaked technical string.
 */
function getRpcErrorBodyMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body?: unknown }).body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }
  }
  return undefined;
}

// `readErrorBody`'s own fallback strings (runtime.ts) all start this way when it can't parse a
// real error body — restating the status the caller already knows, never genuinely informative.
const RPC_PLACEHOLDER_MESSAGE_PATTERN = /^RPC call returned status \d+/;

/** Resolves the copy shown for a failed `createApiKey` call. 403 always gets the specific
 * permission message (regardless of body content, since the body is unreliable for this exact
 * failure — see the module comment above); any other status uses the body's message when it
 * looks like real server content, otherwise a generic fallback. */
function resolveCreateApiKeyErrorMessage(error: unknown, t: (key: string) => string): string {
  if (getRpcErrorStatus(error) === 403) {
    return t('apiKeys.createForbidden');
  }
  const bodyMessage = getRpcErrorBodyMessage(error);
  if (bodyMessage && !RPC_PLACEHOLDER_MESSAGE_PATTERN.test(bodyMessage)) {
    return bodyMessage;
  }
  return t('apiKeys.createErrorGeneric');
}

export function ApiKeyCreateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [generatedOauth2Url, setGeneratedOauth2Url] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const { mutate: ensureAccount, isPending: isAccountEnsuring } = useEnsureDefaultAccount();
  const { mutate: ensureProject, isPending: isProjectEnsuring } = useEnsureDefaultProject();
  const { mutate: createKey, isPending: isKeyCreating } = useCreateApiKey();
  const { has } = usePermissions();
  // Only project leads may mint keys on a non-free plan; everyone else is pinned to `free`.
  // Note this is the coarse capability only — the server additionally requires the caller to own
  // the project's account or hold `role: 'lead'` on it, so a `403` is still possible here.
  const canChoosePlan = has('project:member');
  const projectId = typeof params.projectId === 'string' ? params.projectId : null;

  const handleBack = () => {
    // After key creation, the user intent is to go back to the API Keys list (not the previous route).
    // Use `replace` so the create screen is not kept in the back stack.
    if (generatedSecret) {
      const projectQuery = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
      router.replace(`/api-keys${projectQuery}`);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/api-keys');
  };

  const handleCreate = async (name: string, billingPlan: string) => {
    // Clear any stale failure from a previous attempt as soon as a new one starts, so a retry
    // never shows an old error next to a fresh, still-in-flight submission.
    setCreateError(null);
    try {
      const resolvedProjectId = projectId ?? (await ensureProject((await ensureAccount()).id)).id;

      await createKey(
        { input: { name, billingPlan }, projectId: resolvedProjectId },
        {
          onSuccess: (data) => {
            if (data?.secret) {
              setGeneratedSecret(data.secret);
              setGeneratedOauth2Url(data.oauth2Url ?? null);
            }
          },
        }
      );
    } catch (error) {
      console.error('Failed to create API key with bootstrap:', error);
      setCreateError(resolveCreateApiKeyErrorMessage(error, t));
    }
  };

  const isPending = (!projectId && (isAccountEnsuring || isProjectEnsuring)) || isKeyCreating;

  return (
    <ApiKeyCreateView
      onBack={handleBack}
      onCopy={copyToClipboard}
      onCreate={handleCreate}
      isCreating={isPending}
      canChoosePlan={canChoosePlan}
      generatedSecret={generatedSecret}
      generatedOauth2Url={generatedOauth2Url}
      createError={createError}
    />
  );
}
