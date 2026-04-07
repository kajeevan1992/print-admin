import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(14,20,34,0.88),rgba(10,15,27,0.92))] p-4 shadow-[0_16px_42px_rgba(0,0,0,0.18)] backdrop-blur-md md:p-5',
        className
      )}
    >
      {children}
    </section>
  );
}
