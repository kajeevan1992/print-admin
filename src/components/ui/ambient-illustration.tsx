import { cn } from '@/lib/utils';

export function AmbientIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none relative h-56 w-full overflow-hidden rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]', className)}>
      <div className="absolute -left-8 top-4 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(124,140,255,0.4),rgba(124,140,255,0))] blur-2xl" />
      <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.28),rgba(56,189,248,0))] blur-2xl" />
      <div className="absolute inset-x-10 top-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute inset-x-12 bottom-12 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="absolute left-10 top-20 h-24 w-24 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-md" />
      <div className="absolute left-20 top-28 h-20 w-36 rounded-[24px] border border-white/10 bg-white/[0.025] backdrop-blur-md" />
      <div className="absolute right-16 top-16 h-28 w-28 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md" />
      <div className="absolute right-24 bottom-10 h-16 w-40 rounded-[22px] border border-white/10 bg-white/[0.025] backdrop-blur-md" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-[radial-gradient(circle,rgba(56,189,248,0.18),rgba(56,189,248,0.02))] shadow-[0_0_80px_rgba(56,189,248,0.08)]" />
    </div>
  );
}
