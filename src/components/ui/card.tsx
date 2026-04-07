import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(16,22,36,0.82),rgba(10,15,27,0.88))] p-4 shadow-[0_14px_38px_rgba(0,0,0,0.18)] backdrop-blur-xl md:p-5',
        className
      )}
    >
      {children}
    </section>
  );
}
