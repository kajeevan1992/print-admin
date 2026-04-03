'use client';

import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-xl border border-border bg-panelMuted px-4 py-3 text-sm text-text outline-none transition placeholder:text-textMuted focus:border-accent',
        props.className
      )}
    />
  );
}
