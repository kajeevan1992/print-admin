import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-white/5 bg-[linear-gradient(180deg,rgba(14,19,34,0.84),rgba(10,14,25,0.9))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl md:p-5',
        className
      )}
    >
      {children}
    </section>
  );
}
