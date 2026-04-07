import Link from 'next/link';
import { AlertCircle, ArrowRight, Rocket, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const checks = [
  { label: 'Catalog structure reviewed', status: 'Ready', href: '/catalog-launch-wizard' },
  { label: 'Storefront theme polished', status: 'Review', href: '/design-studio' },
  { label: 'Launch QA walkthrough', status: 'Pending', href: '/launch-qa' }
];

export default function LaunchReadinessPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Launch Readiness" subtitle="A quick launch confidence view for catalog, storefront, and experience quality before go-live." />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><Rocket size={18} /></div><div><h2 className="text-lg font-semibold tracking-[-0.03em] text-white">Launch checklist</h2><p className="text-[13px] text-textMuted">Use this as the final handoff view for the store launch run.</p></div></div>
          <div className="space-y-3">
            {checks.map((check) => (
              <Link key={check.label} href={check.href} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]">
                <div>
                  <p className="text-sm font-medium text-white">{check.label}</p>
                  <p className="mt-1 text-[12.5px] text-textMuted">Status: {check.status}</p>
                </div>
                <ArrowRight size={14} className="text-textMuted" />
              </Link>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-emerald-300"><ShieldCheck size={18} /></div><div><h2 className="text-lg font-semibold tracking-[-0.03em] text-white">Confidence snapshot</h2><p className="text-[13px] text-textMuted">A lighter review panel for final decisions.</p></div></div>
          <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-[13px]"><span className="text-textMuted">Catalog coverage</span><span className="text-white">Strong</span></div>
            <div className="flex items-center justify-between text-[13px]"><span className="text-textMuted">Visual polish</span><span className="text-white">Needs review</span></div>
            <div className="flex items-center justify-between text-[13px]"><span className="text-textMuted">Go-live blockers</span><span className="text-white">1 active</span></div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[13px] leading-6 text-amber-100">
            <div className="flex items-start gap-3"><AlertCircle size={16} className="mt-1 text-amber-300" /><p>Review theme and campaign surfaces one more time so the launch feels lighter and more premium at default browser zoom.</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
