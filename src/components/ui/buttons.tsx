import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode };

export function Button({ children, className, ...props }: Props) {
  return (
    <button {...props} className={cn('rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-panelMuted', className)}>
      {children}
    </button>
  );
}

export function PrimaryButton({ children, className, ...props }: Props) {
  return (
    <button {...props} className={cn('rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90', className)}>
      {children}
    </button>
  );
}
