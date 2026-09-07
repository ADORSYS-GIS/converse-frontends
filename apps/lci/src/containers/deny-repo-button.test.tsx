import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const denyRepoActionMock = vi.fn();
vi.mock('./repository-actions', () => ({
  denyRepoAction: (formData: FormData) => denyRepoActionMock(formData),
}));

const { DenyRepoButton } = await import('./deny-repo-button');

describe('DenyRepoButton', () => {
  beforeEach(() => {
    refreshMock.mockReset();
    denyRepoActionMock.mockReset();
  });

  it('keeps the destructive action behind a closed dialog until the button is clicked', () => {
    render(<DenyRepoButton id={81} slug="acme/widgets" />);

    expect(screen.getByRole('button', { name: 'Deny repository' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(denyRepoActionMock).not.toHaveBeenCalled();
  });

  it('will not confirm until the exact repository name is typed', async () => {
    const user = userEvent.setup();
    render(<DenyRepoButton id={81} slug="acme/widgets" />);

    await user.click(screen.getByRole('button', { name: 'Deny repository' }));

    const confirm = screen.getByRole('button', { name: 'Deny' });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText('Type "acme/widgets" to confirm'), 'acme/widg');
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText('Type "acme/widgets" to confirm'), 'ets');
    expect(confirm).toBeEnabled();
  });

  it('submits the repository id and refreshes the route once confirmed', async () => {
    denyRepoActionMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<DenyRepoButton id={81} slug="acme/widgets" />);

    await user.click(screen.getByRole('button', { name: 'Deny repository' }));
    await user.type(screen.getByLabelText('Type "acme/widgets" to confirm'), 'acme/widgets');
    await user.click(screen.getByRole('button', { name: 'Deny' }));

    expect(denyRepoActionMock).toHaveBeenCalledTimes(1);
    const [formData] = denyRepoActionMock.mock.calls[0] as [FormData];
    expect(formData.get('id')).toBe('81');
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows a server error inline and keeps the dialog open on failure', async () => {
    denyRepoActionMock.mockRejectedValueOnce(new Error('Failed to deny repository.'));
    const user = userEvent.setup();
    render(<DenyRepoButton id={81} slug="acme/widgets" />);

    await user.click(screen.getByRole('button', { name: 'Deny repository' }));
    await user.type(screen.getByLabelText('Type "acme/widgets" to confirm'), 'acme/widgets');
    await user.click(screen.getByRole('button', { name: 'Deny' }));

    expect(await screen.findByText('Failed to deny repository.')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
