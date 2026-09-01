import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectNameDialog } from './component';

function baseProps(
  overrides: Partial<React.ComponentProps<typeof ProjectNameDialog>> = {}
): React.ComponentProps<typeof ProjectNameDialog> {
  return {
    open: true,
    projectId: 'proj_7f21c0a4',
    currentName: 'gateway-prod',
    name: 'gateway-prod',
    onNameChange: vi.fn(),
    submitting: false,
    canSubmit: false,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('ProjectNameDialog', () => {
  it('names the project it targets by id, not only by display name', async () => {
    render(<ProjectNameDialog {...baseProps()} />);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Rename project');
    // Two projects can share a display name; their ids cannot. The id is what makes the dialog
    // unambiguous about which row the write lands on.
    expect(dialog).toHaveTextContent('proj_7f21c0a4');
    expect(dialog).toHaveTextContent('gateway-prod');
  });

  it('keeps the primary unavailable while the value has not actually changed', async () => {
    render(<ProjectNameDialog {...baseProps()} />);

    expect(await screen.findByRole('button', { name: 'Save name' })).toBeDisabled();
  });

  it('submits once the name differs', async () => {
    const onSubmit = vi.fn();
    render(
      <ProjectNameDialog {...baseProps({ name: 'gateway-edge', canSubmit: true, onSubmit })} />
    );

    (await screen.findByRole('button', { name: 'Save name' })).click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('routes a field-attributed rejection onto the field', async () => {
    render(<ProjectNameDialog {...baseProps({ nameError: 'project name must not be blank' })} />);

    expect(await screen.findByText('project name must not be blank')).toBeInTheDocument();
  });

  it('keeps an unattributable failure inline and leaves the dialog open', async () => {
    render(<ProjectNameDialog {...baseProps({ error: 'permission denied' })} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('blocks a second submit while one is in flight', async () => {
    render(<ProjectNameDialog {...baseProps({ canSubmit: true, submitting: true })} />);

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('cancels', async () => {
    const onCancel = vi.fn();
    render(<ProjectNameDialog {...baseProps({ onCancel })} />);

    (await screen.findByRole('button', { name: 'Cancel' })).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
