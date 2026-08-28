import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MutationFailureBanner } from './component';

describe('MutationFailureBanner', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(
      <MutationFailureBanner message={undefined} onDismiss={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty-string message', () => {
    const { container } = render(<MutationFailureBanner message="" onDismiss={() => {}} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the failure message in the signal colour as an alert', () => {
    render(<MutationFailureBanner message="Could not revoke the key." onDismiss={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Could not revoke the key.');
    expect(screen.getByText('Could not revoke the key.')).toHaveClass('text-primary');
  });

  it('fires onDismiss from the explicit × — the only way it goes away', () => {
    const onDismiss = vi.fn();
    render(<MutationFailureBanner message="Could not revoke the key." onDismiss={onDismiss} />);

    screen.getByRole('button', { name: 'Dismiss' }).click();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
