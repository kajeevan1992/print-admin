import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(15,21,37,0.92),rgba(11,16,29,0.94))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md md:p-5',
        className
      )}
    >
      {children}
    </section>
  );
}
