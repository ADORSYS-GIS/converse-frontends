import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { NavItem } from '../nav-item';
import { NavContainer } from './component';

const meta: Meta<typeof NavContainer> = {
  title: 'UI/NavContainer',
  component: NavContainer,
};

export default meta;
type Story = StoryObj<typeof NavContainer>;

export const Sidebar: Story = {
  render: () => (
    <NavContainer placement="sidebar" style={{ position: 'relative', height: 240 }}>
      <NavItem placement="sidebar" label="Home" active />
      <NavItem placement="sidebar" label="Keys" />
    </NavContainer>
  ),
};

export const Bottom: Story = {
  render: () => (
    <NavContainer placement="bottom">
      <NavItem placement="bottom" label="Home" active />
      <NavItem placement="bottom" label="Keys" />
      <NavItem placement="bottom" label="Settings" />
    </NavContainer>
  ),
};
