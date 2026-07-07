import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Lottie } from './component';

// A minimal, self-contained bodymovin animation (a single pulsing circle) so
// this story doesn't depend on a real asset file or network access.
const PULSING_DOT = {
  v: '5.5.7',
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: 'dot',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [50, 50, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [80, 80, 100] },
            { t: 30, s: [110, 110, 100] },
            { t: 60, s: [80, 80, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } },
            { ty: 'fl', c: { a: 0, k: [0.11, 0.36, 1, 1] }, o: { a: 0, k: 100 } },
            { ty: 'tr' },
          ],
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
  markers: [],
};

const meta: Meta<typeof Lottie> = {
  title: 'UI/Lottie',
  component: Lottie,
  args: {
    source: PULSING_DOT as never,
  },
};

export default meta;
type Story = StoryObj<typeof Lottie>;

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
export const Muted: Story = { args: { size: 'md', tone: 'muted' } };
