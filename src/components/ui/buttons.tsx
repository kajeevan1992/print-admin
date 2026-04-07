import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode };

export function Button({ children, className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-xl border border-white/7 bg-white/[0.025] px-3.5 py-2 text-[12px] font-medium text-text transition hover:border-white/14 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-accent to-accentAlt px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(82,123,255,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}
