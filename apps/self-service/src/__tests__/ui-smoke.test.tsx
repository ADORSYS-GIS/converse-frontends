import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from '@lightbridge/ui';

describe('@lightbridge/ui smoke render', () => {
  it('renders a Text primitive with its children', async () => {
    await render(<Text intent="bodyStrong">Hello</Text>);

    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
