import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createBlankRuleSet } from '@lightbridge/ui-web';

import type { AdminRefillPoliciesFormScreen } from './use-refill-policies-screen';

/**
 * Container-level acceptance coverage for `/admin/refill-policies/create` (owner review round 2,
 * 2026-08-31, converse-frontends#368 finding #4, verbatim): "You made out of
 * /admin/refill-policies?create=true a full page. Instead, I was thinking of a modal. But it's
 * fine. Just move it to a page /admin/refill-policies/create." Migrated from the deleted
 * "create mode" cases in `admin-refill-policies-centre.test.tsx` — same assertions, now against
 * this route's own hook/container pair. `useRefillPolicyCreateScreen` is mocked wholesale, the
 * same pattern every other `*-centre.test.tsx` in this app uses.
 */
const useRefillPolicyCreateScreenMock = vi.fn();
vi.mock('./use-refill-policy-create-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-refill-policy-create-screen')>();
  return {
    ...actual,
    useRefillPolicyCreateScreen: () => useRefillPolicyCreateScreenMock(),
  };
});

function baseForm(
  overrides: Partial<AdminRefillPoliciesFormScreen> = {}
): AdminRefillPoliciesFormScreen {
  return {
    mode: 'create',
    // The real hook always returns this on the create route (issue #445) — the edit route never
    // does, which is what `admin-refill-policies-centre.test.tsx` asserts from the other side.
    startFromExample: {
      onStart: vi.fn(),
      confirmOpen: false,
      onConfirm: vi.fn(),
      onCancelConfirm: vi.fn(),
    },
    policySetId: '',
    onPolicySetIdChange: vi.fn(),
    policySetIdReadOnly: false,
    ruleSet: createBlankRuleSet(),
    onRuleSetChange: vi.fn(),
    canSubmit: false,
    activating: false,
    onActivate: vi.fn(),
    savingRevision: false,
    onSaveRevisionOnly: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<AdminRefillPoliciesFormScreen> = {}) {
  useRefillPolicyCreateScreenMock.mockReturnValue(baseForm(overrides));
  const { AdminRefillPolicyCreateCentre } = await import('./admin-refill-policy-create-centre');
  return render(<AdminRefillPolicyCreateCentre />);
}

describe('AdminRefillPolicyCreateCentre', () => {
  it('renders the rule-set-form, never the simulator or the edit caption', async () => {
    await renderCentre();

    expect(screen.getByText('Policy rule set')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create & activate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as revision only' })).toBeInTheDocument();
    expect(screen.queryByText(/starts from a blank draft/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simulate' })).not.toBeInTheDocument();
  });

  it('titles the page "New refill policy" — no target id to author a replacement for yet', () => {
    return renderCentre().then(() => {
      expect(screen.getByText('New refill policy')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Author a brand-new policy set from scratch — or start from the example and edit it.'
        )
      ).toBeInTheDocument();
    });
  });

  it('disables both submit actions while the draft fails validation', async () => {
    await renderCentre({ canSubmit: false });

    expect(screen.getByRole('button', { name: 'Create & activate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as revision only' })).toBeDisabled();
  });

  it('enables both submit actions once the draft is valid', async () => {
    await renderCentre({ canSubmit: true });

    expect(screen.getByRole('button', { name: 'Create & activate' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save as revision only' })).toBeEnabled();
  });

  it('leaves the policy set id field editable — this is the one mode that names its own id', async () => {
    await renderCentre();

    expect(screen.getByLabelText('Policy set id')).not.toBeDisabled();
  });

  // Issue #445 — the example affordances.
  it('shows the policy set id example under its label, not as a placeholder', async () => {
    await renderCentre();

    const control = screen.getByLabelText('Policy set id');
    expect(control).not.toHaveAttribute('placeholder');
    const describedBy = control.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)?.textContent).toBe('e.g. budget-refill-2026-09');
  });

  it('offers "Start from example policy" and hands the press to the screen', async () => {
    const onStart = vi.fn();
    await renderCentre({
      startFromExample: {
        onStart,
        confirmOpen: false,
        onConfirm: vi.fn(),
        onCancelConfirm: vi.fn(),
      },
    });

    screen.getByRole('button', { name: 'Start from example policy' }).click();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('gates the overwrite behind a confirmation when the screen says the draft is dirty', async () => {
    const onConfirm = vi.fn();
    await renderCentre({
      startFromExample: {
        onStart: vi.fn(),
        confirmOpen: true,
        onConfirm,
        onCancelConfirm: vi.fn(),
      },
    });

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Replace this draft with the example policy?')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Replace my draft' }).click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancel navigates back to the list rather than clearing a mode param — there is none here', async () => {
    const onCancel = vi.fn();
    await renderCentre({ onCancel });

    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
