'use client';

import { getApiErrorMessage } from '@lightbridge/hooks/api-error';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { buildProvisionAccountInput } from './build-provision-account-input';
import { classifyProvisionAccountError } from './rpc-field-error';

/**
 * `/admin/provision-account` (lightbridge-authz#720/#722): an admin types a Keycloak subject,
 * email, and optional display name, and the form calls `procedure.provisionAccount` directly —
 * same shape as `useRefillPolicyCreateScreen`, its closest precedent (a full admin page, not a
 * dialog, with a single one-shot write and no prior data to prefill).
 *
 * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — pre-submit form drafts that must never reach a URL
 * or history): the three typed fields. `result` holds the provisioned account's own id once the
 * call succeeds; there is no "view another subject's account" page to navigate to (unlike
 * `useRefillPolicyCreateScreen`'s `router.push` back to the policy list — this form has no list to
 * return to), so success renders inline and `onProvisionAnother` just clears the draft in place.
 */
export function useProvisionAccountScreen() {
  const client = useConsoleAuthzClient();

  // SANCTIONED LOCAL STATE (ADR 0011 Decision 3) — see this function's own doc comment above.
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subjectError, setSubjectError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<{ accountId: string } | undefined>(undefined);

  const canSubmit = subject.trim() !== '' && email.trim() !== '' && !submitting;

  const clearErrors = () => {
    setSubjectError(undefined);
    setEmailError(undefined);
    setError(undefined);
  };

  const onProvision = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    clearErrors();
    setResult(undefined);
    client.procedures
      .provisionAccount({ args: buildProvisionAccountInput({ subject, email, name }) })
      .then((account) => {
        setSubmitting(false);
        setResult({ accountId: account.id });
      })
      .catch((cause: unknown) => {
        setSubmitting(false);
        const message = getApiErrorMessage(cause);
        const classified = classifyProvisionAccountError(message);
        setSubjectError(classified.subjectError);
        setEmailError(classified.emailError);
        setError(classified.error);
      });
  };

  const onProvisionAnother = () => {
    setSubject('');
    setEmail('');
    setName('');
    clearErrors();
    setResult(undefined);
  };

  return {
    subject,
    onSubjectChange: setSubject,
    subjectError,
    email,
    onEmailChange: setEmail,
    emailError,
    name,
    onNameChange: setName,
    canSubmit,
    submitting,
    error,
    result,
    onProvision,
    onProvisionAnother,
  };
}

export type ProvisionAccountScreen = ReturnType<typeof useProvisionAccountScreen>;
