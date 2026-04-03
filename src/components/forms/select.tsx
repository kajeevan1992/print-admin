'use client';

import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: string[];
}) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-xl border border-border bg-panelMuted px-4 py-3 text-sm text-text outline-none transition focus:border-accent',
        className
      )}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
