import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { FormField } from '@lightbridge/ui';

const CHILD = <Text>input-slot</Text>;

describe('FormField (presentational shell)', () => {
  it('renders label, description and the child input slot', async () => {
    await render(
      <FormField label="Key name" description="Shown in the list later">
        {CHILD}
      </FormField>,
    );

    expect(screen.getByText('Key name')).toBeTruthy();
    expect(screen.getByText('Shown in the list later')).toBeTruthy();
    expect(screen.getByText('input-slot')).toBeTruthy();
  });

  it('shows the error and suppresses the helper when both are provided', async () => {
    await render(
      <FormField label="Key name" helper="Use letters and dashes" error="Name is required">
        {CHILD}
      </FormField>,
    );

    expect(screen.getByText('Name is required')).toBeTruthy();
    expect(screen.queryByText('Use letters and dashes')).toBeNull();
  });

  it('falls back to the helper when there is no error', async () => {
    await render(
      <FormField label="Key name" helper="Use letters and dashes">
        {CHILD}
      </FormField>,
    );

    expect(screen.getByText('Use letters and dashes')).toBeTruthy();
  });

  it('renders without label, description, helper or error', async () => {
    await render(<FormField>{CHILD}</FormField>);

    expect(screen.getByText('input-slot')).toBeTruthy();
  });
});
