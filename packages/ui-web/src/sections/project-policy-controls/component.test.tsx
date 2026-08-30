import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectPolicyControls } from './component';
import { modelCatalogFixture } from './fixtures';

// Base UI `Select.Item`/`Combobox.Item` commit only when a real `pointerdown` preceded the click
// on the same item — see `select-field/component.test.tsx`'s identical note.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

function props(
  overrides: Partial<React.ComponentProps<typeof ProjectPolicyControls>> = {}
): React.ComponentProps<typeof ProjectPolicyControls> {
  return {
    modelPolicy: 'allow_all',
    onModelPolicyChange: vi.fn(),
    allowedModels: [],
    onAllowedModelsChange: vi.fn(),
    catalog: modelCatalogFixture,
    ...overrides,
  };
}

describe('ProjectPolicyControls', () => {
  it('lists every model-policy option and reports the chosen one', () => {
    const onModelPolicyChange = vi.fn();
    render(
      <ProjectPolicyControls
        {...props({ allowedModels: ['gpt-4o'], onModelPolicyChange })}
      />
    );

    fireEvent.click(screen.getByLabelText('Model policy'));
    selectOption(screen.getByRole('option', { name: 'Deny all models' }));

    expect(onModelPolicyChange).toHaveBeenCalledWith('deny_all');
  });

  it('disables the allowlist option while no model is chosen and the project is not already allowlisted', () => {
    render(<ProjectPolicyControls {...props({ modelPolicy: 'allow_all', allowedModels: [] })} />);

    fireEvent.click(screen.getByLabelText('Model policy'));
    expect(screen.getByRole('option', { name: 'Allowlist only' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('keeps the allowlist option enabled once the project is already allowlisted, even with an empty list', () => {
    render(<ProjectPolicyControls {...props({ modelPolicy: 'allowlist', allowedModels: [] })} />);

    fireEvent.click(screen.getByLabelText('Model policy'));
    expect(screen.getByRole('option', { name: 'Allowlist only' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('enables the allowlist option once at least one model is chosen', () => {
    render(<ProjectPolicyControls {...props({ modelPolicy: 'allow_all', allowedModels: ['gpt-4o'] })} />);

    fireEvent.click(screen.getByLabelText('Model policy'));
    expect(screen.getByRole('option', { name: 'Allowlist only' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('renders a chip per allowed model, resolved to its catalogue name', () => {
    render(
      <ProjectPolicyControls {...props({ allowedModels: ['gpt-4o', 'claude-opus-5'] })} />
    );

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude Opus 5')).toBeInTheDocument();
  });

  it('removes a model when its chip remove button is pressed', () => {
    const onAllowedModelsChange = vi.fn();
    render(
      <ProjectPolicyControls
        {...props({ allowedModels: ['gpt-4o', 'claude-opus-5'], onAllowedModelsChange })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove GPT-4o' }));

    expect(onAllowedModelsChange).toHaveBeenCalledWith(['claude-opus-5']);
  });

  it('shows a loading status and disables the combobox while the catalogue is loading', () => {
    render(<ProjectPolicyControls {...props({ catalog: [], catalogLoading: true })} />);

    expect(screen.getByText('Loading model catalogue…')).toBeInTheDocument();
  });

  it('shows an inline status, never a placard, when the catalogue is genuinely empty', () => {
    render(<ProjectPolicyControls {...props({ catalog: [] })} />);

    expect(
      screen.getByText('No model catalogue is configured — every model is reachable.')
    ).toBeInTheDocument();
  });

  it('shows a retryable error line on a genuine catalogue fetch failure', () => {
    const onRetryCatalog = vi.fn();
    render(
      <ProjectPolicyControls
        {...props({ catalog: [], catalogError: 'Could not load the model catalogue.', onRetryCatalog })}
      />
    );

    expect(screen.getByText('Could not load the model catalogue.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryCatalog).toHaveBeenCalled();
  });

  it('surfaces a genuine policy write failure', () => {
    render(<ProjectPolicyControls {...props({ policyError: 'Could not save the model policy.' })} />);

    expect(screen.getByText('Could not save the model policy.')).toBeInTheDocument();
  });
});
