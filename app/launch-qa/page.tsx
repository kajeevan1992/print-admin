import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleDashed, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const qa = [
  { label: 'Review catalog wizard output', href: '/catalog-launch-wizard', done: true },
  { label: 'Review design surfaces', href: '/design-studio', done: false },
  { label: 'Confirm store launch flow', href: '/store-launch-wizard', done: false },
  { label: 'Check readiness summary', href: '/launch-readiness', done: true }
];

export default function LaunchQAPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Launch QA" subtitle="A compact review board for final checks before handoff or go-live." />
      <Card className="space-y-4">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><ClipboardCheck size={18} /></div><div><h2 className="text-lg font-semibold tracking-[-0.03em] text-white">Final checks</h2><p className="text-[13px] text-textMuted">Keep the last-mile review short, calm, and visible.</p></div></div>
        <div className="space-y-3">
          {qa.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]">
              <div className="flex items-center gap-3">
                {item.done ? <CheckCircle2 size={16} className="text-emerald-300" /> : <CircleDashed size={16} className="text-textMuted" />}
                <span className="text-[13px] font-medium text-white">{item.label}</span>
              </div>
              <ArrowRight size={14} className="text-textMuted" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
