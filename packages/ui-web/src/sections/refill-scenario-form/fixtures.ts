import type { ScenarioErrors, ScenarioValue } from './types';

export const scenarioFormPopulated: ScenarioValue = {
  effectiveBalance: '42',
  selfServiceGrantCount: '1',
  spendThisPeriodKnown: true,
  spendThisPeriod: '10',
  spendLastPeriodKnown: false,
  spendLastPeriod: '',
};

export const scenarioFormEmpty: ScenarioValue = {
  effectiveBalance: '',
  selfServiceGrantCount: '',
  spendThisPeriodKnown: false,
  spendThisPeriod: '',
  spendLastPeriodKnown: false,
  spendLastPeriod: '',
};

export const scenarioFormErrors: ScenarioErrors = {
  effectiveBalance: 'Enter a non-negative amount.',
  selfServiceGrantCount: 'Enter a whole number, 0 or greater.',
  spendThisPeriod: 'Enter a non-negative amount, or mark spend unavailable.',
};

export const scenarioFormWithErrors: ScenarioValue = {
  effectiveBalance: 'nope',
  selfServiceGrantCount: '-1',
  spendThisPeriodKnown: true,
  spendThisPeriod: 'nope',
  spendLastPeriodKnown: false,
  spendLastPeriod: '',
};
