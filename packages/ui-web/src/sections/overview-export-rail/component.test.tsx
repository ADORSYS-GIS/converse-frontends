import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OverviewExportRail } from './component';
import { overviewExportCaption, overviewExportUnavailableCaption } from './fixtures';

describe('OverviewExportRail', () => {
  it('fires onExport from its action', () => {
    const onExport = vi.fn();
    render(<OverviewExportRail onExport={onExport} caption={overviewExportCaption} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export current view · CSV' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('omits the caption when none is given', () => {
    const { container } = render(<OverviewExportRail />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  // console-ui#324 — the CSV export route doesn't exist yet: the control must be a natively
  // disabled button with the reason stated beside it, never a click that silently no-ops.
  it('disables the button and states the reason instead of wiring a silent no-op', () => {
    const onExport = vi.fn();
    render(
      <OverviewExportRail onExport={onExport} disabled caption={overviewExportUnavailableCaption} />
    );

    const button = screen.getByRole('button', { name: 'Export current view · CSV' });
    expect(button).toBeDisabled();
    expect(screen.getByText("Export isn't available yet.")).toBeInTheDocument();

    fireEvent.click(button);
    expect(onExport).not.toHaveBeenCalled();
  });
});
