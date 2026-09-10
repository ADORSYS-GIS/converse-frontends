import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createBlankRuleSet, createBlankScenario } from '@lightbridge/ui-web';

import type { AdminRefillPoliciesScreen } from './use-refill-policies-screen';

/**
 * Container-level acceptance coverage for `/admin/refill-policies` — mode routing (list/edit/
 * simulate, never composed together), the honest edit caption, and basic validation-gated submit
 * wiring. `useRefillPoliciesScreen` is mocked wholesale, matching every other `*-centre.test.tsx`
 * in this app (see the deleted `refill-options-centre.test.tsx` this file replaces for the same
 * pattern).
 *
 * **`create` is no longer one of this route's modes** (owner review round 2, 2026-08-31,
 * converse-frontends#368 finding #4) — it moved to `/admin/refill-policies/create`, covered by
 * `admin-refill-policy-create-centre.test.tsx` instead.
 */
const useRefillPoliciesScreenMock = vi.fn();
vi.mock('./use-refill-policies-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-refill-policies-screen')>();
  return {
    ...actual,
    useRefillPoliciesScreen: () => useRefillPoliciesScreenMock(),
  };
});

function baseScreen(overrides: Partial<AdminRefillPoliciesScreen> = {}): AdminRefillPoliciesScreen {
  const { list, form, simulate, ...rest } = overrides;
  return {
    mode: 'list',
    scopeLabel: 'adorsys-gis',
    ...rest,
    list: {
      policySetId: '',
      onPolicySetIdChange: vi.fn(),
      status: {
        status: 'unavailable',
        caption:
          'No known policy set id to check yet — there is no discovery procedure for one today (converse-frontends#368).',
      },
      ladder: { status: 'ready', amounts: ['+$5.00', '+$12.00'] },
      manualOpen: false,
      onManualOpenChange: vi.fn(),
      ...list,
    },
    form: {
      mode: 'edit',
      policySetId: 'budget-refill',
      onPolicySetIdChange: undefined,
      policySetIdReadOnly: true,
      ruleSet: createBlankRuleSet(),
      onRuleSetChange: vi.fn(),
      canSubmit: false,
      activating: false,
      onActivate: vi.fn(),
      savingRevision: false,
      onSaveRevisionOnly: vi.fn(),
      onCancel: vi.fn(),
      ...form,
    },
    simulate: {
      policySetId: 'budget-refill',
      ruleSet: createBlankRuleSet(),
      onRuleSetChange: vi.fn(),
      scenario: createBlankScenario(),
      onScenarioChange: vi.fn(),
      requestedAmount: '',
      onRequestedAmountChange: vi.fn(),
      submitting: false,
      canSubmit: false,
      onSubmit: vi.fn(),
      onBack: vi.fn(),
      ...simulate,
    },
  };
}

async function renderCentre(overrides: Partial<AdminRefillPoliciesScreen> = {}) {
  useRefillPoliciesScreenMock.mockReturnValue(baseScreen(overrides));
  const { AdminRefillPoliciesCentre } = await import('./admin-refill-policies-centre');
  return render(<AdminRefillPoliciesCentre />);
}

describe('AdminRefillPoliciesCentre', () => {
  it('list mode: renders the lookup zone, the real ladder amounts, and the manual — never composes the form or simulator', async () => {
    await renderCentre();

    expect(screen.getByLabelText('Policy set id')).toBeInTheDocument();
    expect(screen.getByText('+$5.00 · +$12.00')).toBeInTheDocument();
    expect(screen.getByText('How refill policies work')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create & activate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simulate' })).not.toBeInTheDocument();
  });

  it('list mode: offers no Edit/Simulate action before a lookup is ready', async () => {
    await renderCentre();

    expect(
      screen.queryByRole('button', { name: /Author a replacement revision/ })
    ).not.toBeInTheDocument();
  });

  // Owner review round 2 (2026-08-31, converse-frontends#368 finding #4): a real link to the
  // new dedicated route, not a mode-switch callback — there is no `onNewPolicy` on the screen
  // shape any more.
  it('list mode: offers + New policy as a real link to /admin/refill-policies/create', async () => {
    await renderCentre();

    const link = screen.getByRole('button', { name: '+ New policy' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin/refill-policies/create');
  });

  it('edit mode: honestly labels the target and states the no-prefill gap — never a fake prefill', async () => {
    await renderCentre({
      mode: 'edit',
      form: { mode: 'edit', policySetId: 'budget-refill', policySetIdReadOnly: true } as never,
    });

    expect(screen.getByText('Author a replacement revision for budget-refill')).toBeInTheDocument();
    expect(screen.getByText(/starts from a blank draft/)).toBeInTheDocument();
    expect(screen.getByText(/converse-frontends#368/)).toBeInTheDocument();
    expect(screen.getByLabelText('Policy set id')).toBeDisabled();
  });

  it('edit mode: never offers "Start from example policy" — create-only (issue #445)', async () => {
    await renderCentre({
      mode: 'edit',
      form: { mode: 'edit', policySetId: 'budget-refill', policySetIdReadOnly: true } as never,
    });

    expect(
      screen.queryByRole('button', { name: 'Start from example policy' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('simulate mode: renders the simulator, never the create/edit form', async () => {
    await renderCentre({ mode: 'simulate' });

    expect(screen.getByText('Simulate against budget-refill')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simulate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create & activate' })).not.toBeInTheDocument();
  });

  it('simulate mode: states plainly that nothing here touches the real active policy', async () => {
    await renderCentre({ mode: 'simulate' });

    expect(
      screen.getByText("Nothing here reads or changes this policy's actual, active revision.")
    ).toBeInTheDocument();
  });
});
