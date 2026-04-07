import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PremiumEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]',
        className
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.06] text-accentAlt">
        <Sparkles size={20} />
      </div>
      <h3 className="mt-4 text-[1.15rem] font-semibold tracking-[-0.03em] text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-textMuted">{description}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/[0.08]"
        >
          {actionLabel}
          <ArrowRight size={14} className="text-textMuted" />
        </Link>
      ) : null}
    </div>
  );
}
