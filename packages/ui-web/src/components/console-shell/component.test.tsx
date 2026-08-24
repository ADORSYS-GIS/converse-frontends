import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConsoleShell } from './component';

describe('ConsoleShell', () => {
  it('renders header, left rail, centre and right rail at the full tier', () => {
    render(
      <ConsoleShell
        tier="full"
        header={<div>Header</div>}
        leftRail={<div>Left rail</div>}
        rightRail={<div>Right rail</div>}
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Left rail')).toBeInTheDocument();
    expect(screen.getByText('Centre')).toBeInTheDocument();
    expect(screen.getByText('Right rail')).toBeInTheDocument();
  });

  it('does not render the right rail inline at the compact tier', () => {
    render(
      <ConsoleShell
        tier="compact"
        header={<div>Header</div>}
        leftRail={<div>Left rail</div>}
        rightRail={<div>Right rail</div>}
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Left rail')).toBeInTheDocument();
    expect(screen.getByText('Centre')).toBeInTheDocument();
    expect(screen.queryByText('Right rail')).not.toBeInTheDocument();
  });

  it('renders only header and centre at the guard tier', () => {
    render(
      <ConsoleShell
        tier="guard"
        header={<div>Header</div>}
        leftRail={<div>Left rail</div>}
        rightRail={<div>Right rail</div>}
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Centre')).toBeInTheDocument();
    expect(screen.queryByText('Left rail')).not.toBeInTheDocument();
    expect(screen.queryByText('Right rail')).not.toBeInTheDocument();
  });

  it('narrows the left rail to 168px at the compact tier', () => {
    render(
      <ConsoleShell tier="compact" header={<div>Header</div>} leftRail={<div>Left rail</div>}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Left rail').parentElement).toHaveClass('w-[168px]');
  });

  it('keeps the left rail at 208px at the full tier', () => {
    render(
      <ConsoleShell tier="full" header={<div>Header</div>} leftRail={<div>Left rail</div>}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Left rail').parentElement).toHaveClass('w-52');
  });

  it('renders the floor background on the shell', () => {
    render(
      <ConsoleShell tier="full" header={<div>Header</div>}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Centre').closest('div.bg-muted')).toBeInTheDocument();
  });
});
