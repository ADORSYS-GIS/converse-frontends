import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OverviewFiltersRail } from './component';
import {
  ACCOUNT_FILTER_OPTIONS,
  MODEL_FILTER_OPTIONS,
  PROJECT_FILTER_OPTIONS,
} from './fixtures';

function props(onProjectChange = vi.fn()) {
  return {
    accountField: {
      label: 'Account',
      value: 'adorsys-gis',
      options: ACCOUNT_FILTER_OPTIONS,
      onChange: vi.fn(),
    },
    projectField: {
      label: 'Project',
      value: 'all',
      options: PROJECT_FILTER_OPTIONS,
      onChange: onProjectChange,
    },
    modelField: {
      label: 'Model',
      value: 'all',
      options: MODEL_FILTER_OPTIONS,
      onChange: vi.fn(),
    },
  };
}

describe('OverviewFiltersRail', () => {
  it('exposes an a11y region and its three controls', () => {
    render(<OverviewFiltersRail {...props()} />);

    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByLabelText('Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
  });

  it('fires the project field onChange when a new option is selected', () => {
    const onChange = vi.fn();
    render(<OverviewFiltersRail {...props(onChange)} />);

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'gateway-prod' } });

    expect(onChange).toHaveBeenCalledWith('gateway-prod');
  });
});
