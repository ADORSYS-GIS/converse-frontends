import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BudgetHero } from '../components/budget-hero';
import { Meter } from '../components/meter';
import { formatUsd, formatUsdAxis, formatUsdOf } from './money';

/**
 * The adaptive-precision USD ladder, rendered rather than described — this is the surface the
 * formatting decision is reviewed on, so that nobody has to reason about `toFixed` call sites to
 * see whether a real production figure survives the trip to the screen.
 *
 * The ladder itself, and the reasoning behind every rung, lives in `lib/money.ts`'s header. These
 * stories exist to make it *visible*: the whole point is a spend of $0.006338 against a $12.00
 * ceiling being legible in the same sentence as its ceiling.
 */
const meta: Meta = {
  title: 'Foundations/Money',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

/**
 * The formatter this replaced, kept VERBATIM (`git show HEAD~:.../money.ts`) rather than
 * approximated as `` `$${amount.toFixed(2)}` ``.
 *
 * It matters that this is the real thing: the old rule already did thin-space grouping and put
 * the minus before the currency sign, so an approximation would light up the `$1 131.80` and
 * `-$42.50` rows as "changed" when nothing about them changed. With the real one, every
 * highlighted cell below is a genuine precision difference and nothing else.
 */
function previousFixedTwoDecimals(amount: number): string {
  const isNegative = amount < 0;
  const [integerPart, decimalPart] = Math.abs(amount).toFixed(2).split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  return `${isNegative ? '-' : ''}$${grouped}.${decimalPart}`;
}

const LADDER_ROWS: { amount: number; note: string }[] = [
  { amount: 0, note: 'exact zero — exact, no extension' },
  { amount: 0.0000004, note: 'below the six-decimal floor — named, not rounded to $0' },
  { amount: 0.000012345, note: 'six decimals' },
  { amount: 0.00012345, note: 'five decimals' },
  { amount: 0.006338, note: 'PRODUCTION spend — four decimals' },
  { amount: 0.034567, note: 'three decimals' },
  { amount: 0.03, note: 'three decimals asked for, pad zero trimmed back' },
  { amount: 0.5, note: 'two decimals already carry two significant digits' },
  { amount: 1, note: 'cents from here up' },
  { amount: 12, note: 'PRODUCTION ceiling' },
  { amount: 142.55, note: 'ungrouped' },
  { amount: 1131.8, note: 'thin-space grouping, never a comma' },
  { amount: 2250000, note: 'repeated thin spaces' },
  { amount: -42.5, note: 'minus before the currency sign' },
];

const HEADING = 'text-subtle font-sans text-[10px] uppercase tracking-[0.12em]';

/**
 * The whole ladder in one table, with the rule it replaced in the middle column.
 *
 * Read the two right-hand columns against each other: everything from `$0.5` down is where fixed
 * two decimals stops carrying information, and the two rows at `$0.006338` and below are where it
 * stops carrying *any* — `$0.01`, then `$0.00`, for accounts that genuinely spent money.
 */
export const PrecisionLadder: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <div className={HEADING}>ADAPTIVE USD — PRECISION LADDER</div>
        <p className="text-soft mt-2 font-sans text-xs">
          Always at least two decimals; extend past two only until the first two significant digits
          are visible; never past six; trim the pad zeros the extension introduced.
        </p>
      </div>
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-border border-b">
            <th className={`${HEADING} py-2 text-left`}>RAW VALUE</th>
            <th className={`${HEADING} py-2 text-right`}>WAS · FIXED 2dp</th>
            <th className={`${HEADING} py-2 text-right`}>NOW · ADAPTIVE</th>
            <th className={`${HEADING} py-2 text-right`}>AXIS TICK</th>
            <th className={`${HEADING} py-2 pl-6 text-left`}>WHY</th>
          </tr>
        </thead>
        <tbody>
          {LADDER_ROWS.map((row) => {
            const was = previousFixedTwoDecimals(row.amount);
            const now = formatUsd(row.amount);
            return (
              <tr key={row.amount} className="border-border/50 border-b">
                <td className="text-soft py-2 text-left">{row.amount}</td>
                <td
                  className={`py-2 text-right ${was === now ? 'text-subtle' : 'text-primary'}`}
                  title={was === now ? undefined : 'changed by the ladder'}>
                  {was}
                </td>
                <td className="text-ink py-2 text-right">{now}</td>
                <td className="text-soft py-2 text-right">{formatUsdAxis(row.amount)}</td>
                <td className="text-subtle py-2 pl-6 text-left font-sans text-[11px]">
                  {row.note}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-subtle font-sans text-[11px]">
        The WAS column is highlighted wherever the old rule and the new one disagree. Note the rows
        it does <em>not</em> touch: nothing at or above $1 gains a single decimal, so{' '}
        <span className="font-mono">$12.4000</span>-style trailing-zero noise never appears.
      </p>
    </div>
  ),
};

/**
 * The pair the console actually renders — `formatUsdOf`, in a `Meter` caption and a `BudgetHero`.
 *
 * Each side is laddered on its own magnitude, deliberately: the ceiling stays `$12.00` rather than
 * being padded to `$12.0000` to match the spend's four decimals. Padding the ceiling would add
 * four digits that say nothing about the ceiling.
 */
export const ProductionPair: Story = {
  name: 'Production pair — $0.006338 of $12.00',
  render: () => (
    <div className="flex max-w-md flex-col gap-8">
      <div>
        <div className={HEADING}>BUDGET HERO</div>
        <div className="mt-4">
          <BudgetHero
            value={0.006338}
            ceiling={12}
            caption="account ceiling · 0.05% used this period"
          />
        </div>
      </div>
      <div>
        <div className={HEADING}>METER CAPTION</div>
        <div className="mt-4">
          <Meter value={0.006338} ceiling={12} label="Account ceiling" />
        </div>
      </div>
      <p className="text-subtle font-sans text-[11px]">
        Rendered under the previous fixed-2dp rule this read{' '}
        <span className="font-mono">$0.01 of $12.00</span> — and a hair lower,{' '}
        <span className="font-mono">$0.00 of $12.00</span>: a spend report that reports nothing.
      </p>
    </div>
  ),
};

const MAGNITUDES: { label: string; value: number; ceiling: number }[] = [
  { label: 'SUB-CENT — real production figures', value: 0.006338, ceiling: 12 },
  { label: 'MID — a project a few dollars in', value: 4.27, ceiling: 12 },
  { label: 'LARGE — an account near its ceiling', value: 1131.8, ceiling: 1250 },
];

/**
 * The three magnitudes side by side. This is the story to look at when judging whether the ladder
 * holds up: all three must read as the same unit, at a glance, without the small one collapsing
 * or the large one growing a tail of zeros.
 */
export const AcrossMagnitudes: Story = {
  render: () => (
    <div className="flex flex-col gap-8 lg:flex-row">
      {MAGNITUDES.map((entry) => (
        <div key={entry.label} className="flex-1">
          <div className={HEADING}>{entry.label}</div>
          <div className="mt-4">
            <BudgetHero
              value={entry.value}
              ceiling={entry.ceiling}
              caption={formatUsdOf(entry.value, entry.ceiling)}
            />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const AcrossMagnitudesLight: Story = {
  name: 'Across magnitudes — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: AcrossMagnitudes.render,
};
