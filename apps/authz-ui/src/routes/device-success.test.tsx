import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeviceSuccessRoute } from './device-success';

describe('DeviceSuccessRoute', () => {
  it('renders the terminal pairing message with no control', () => {
    render(<DeviceSuccessRoute />);

    expect(screen.getByText('Device paired')).not.toBeNull();
    expect(screen.getByText('You can return to your application.')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
