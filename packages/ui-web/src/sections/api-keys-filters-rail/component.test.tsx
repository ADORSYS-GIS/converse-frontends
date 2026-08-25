import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysFiltersRail } from './component';
import { apiKeysStatusFilterOptions } from './fixtures';

describe('ApiKeysFiltersRail', () => {
  it('fires onStatusChange from the segmented control', () => {
    const onStatusChange = vi.fn();
    render(
      <ApiKeysFiltersRail
        statusOptions={apiKeysStatusFilterOptions}
        statusValue="all"
        onStatusChange={onStatusChange}
        search=""
        onSearchChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Revoked' }));

    expect(onStatusChange).toHaveBeenCalledWith('revoked');
  });

  it('fires onSearchChange from the search field', () => {
    const onSearchChange = vi.fn();
    render(
      <ApiKeysFiltersRail
        statusOptions={apiKeysStatusFilterOptions}
        statusValue="all"
        onStatusChange={vi.fn()}
        search=""
        onSearchChange={onSearchChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ci-' } });

    expect(onSearchChange).toHaveBeenCalledWith('ci-');
  });
});
