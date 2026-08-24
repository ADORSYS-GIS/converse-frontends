import React, { useRef } from 'react';

import { cn } from '../../cn';
import { segmentedCellVariants } from './cva';
import type { SegmentedControlProps } from './types';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const ariaLabel = rest['aria-label'];

  function focusAndSelect(index: number) {
    const clamped = (index + options.length) % options.length;
    const option = options[clamped];
    if (!option) return;
    onChange(option.value);
    buttonRefs.current[clamped]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusAndSelect(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusAndSelect(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAndSelect(0);
        break;
      case 'End':
        event.preventDefault();
        focusAndSelect(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex overflow-hidden rounded-[2px] border border-border', className)}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(segmentedCellVariants({ active }), index > 0 && 'border-l border-border')}
          >
            {option.label}
            {active ? <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}
