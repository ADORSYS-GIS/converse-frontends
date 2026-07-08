import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { NavItem } from '../nav-item';
import { NavContainer } from './component';

function GlyphIcon({ active }: Readonly<{ active?: boolean }>) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: active ? '#7c3aed' : '#9ca3af',
      }}
    />
  );
}

const meta: Meta<typeof NavContainer> = {
  title: 'UI/NavContainer',
  component: NavContainer,
};

export default meta;
type Story = StoryObj<typeof NavContainer>;

export const Sidebar: Story = {
  render: () => (
    <NavContainer placement="sidebar" style={{ position: 'relative', height: 240 }}>
      <NavItem placement="sidebar" label="Home" active icon={<GlyphIcon active />} />
      <NavItem placement="sidebar" label="Keys" icon={<GlyphIcon />} />
    </NavContainer>
  ),
};

export const Bottom: Story = {
  render: () => (
    <NavContainer placement="bottom">
      <NavItem placement="bottom" label="Home" active icon={<GlyphIcon active />} />
      <NavItem placement="bottom" label="Keys" icon={<GlyphIcon />} />
      <NavItem placement="bottom" label="Settings" icon={<GlyphIcon />} />
    </NavContainer>
  ),
};
