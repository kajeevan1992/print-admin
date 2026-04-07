import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/5 bg-panel/92 p-4 shadow-card backdrop-blur-sm md:p-5',
        className
      )}
    >
      {children}
    </section>
  );
}
