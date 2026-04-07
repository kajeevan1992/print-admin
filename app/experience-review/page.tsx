import Link from 'next/link';
import { ArrowRight, ScanSearch, Sparkles, Type, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const reviews = [
  { title: 'Typography rhythm', description: 'Check density, scale, and readability at 100% zoom.', href: '/workspace', icon: Type },
  { title: 'Wizard clarity', description: 'Make sure key flows feel guided rather than form-heavy.', href: '/product-launch-wizard', icon: Wand2 },
  { title: 'Overall polish', description: 'Review the product feel across headers, empty states, and cards.', href: '/design-studio', icon: ScanSearch }
];

export default function ExperienceReviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Experience Review" subtitle="A dedicated polish pass for typography, spacing, wizard quality, and premium product feel." />
      <Card>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted"><Sparkles size={12} /> Product feel review</div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {reviews.map((review) => {
            const Icon = review.icon;
            return (
              <Link key={review.title} href={review.href} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><Icon size={18} /></div>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-white">{review.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-textMuted">{review.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-[12.5px] font-medium text-white">Open review <ArrowRight size={14} /></div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
