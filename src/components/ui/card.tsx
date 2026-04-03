import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('rounded-xl border bg-panel p-4 shadow-card', className)}>{children}</section>;
}
