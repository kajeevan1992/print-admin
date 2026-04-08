import Link from 'next/link';
import { ArrowRight, CheckCircle2, Cpu, Package2, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PrimaryButton } from '@/components/ui/buttons';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';

type MiniCard = { title: string; body: string };
type WorkflowStep = { step: string; title: string; body: string };

type Props = {
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaHref: string;
  ctaLabel: string;
  summaryCards: MiniCard[];
  workflow: WorkflowStep[];
  insights: string[];
  linkedAreas: { href: string; label: string }[];
};

export function PluginInspiredHub({ title, subtitle, eyebrow, ctaHref, ctaLabel, summaryCards, workflow, insights, linkedAreas }: Props) {
  const icons = [Sparkles, ShieldCheck, Cpu, Package2];
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} actions={<PrimaryButton asChild><Link href={ctaHref}>{ctaLabel}</Link></PrimaryButton>} />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_30%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
                <Workflow size={12} /> {eyebrow}
              </div>
              <h2 className="mt-4 max-w-2xl text-[2.05rem] font-semibold tracking-[-0.05em] text-white">Plugin-inspired workflow, rebuilt for a calmer admin.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-textMuted">This surface borrows the business intent from your WordPress plugin — then reshapes it into a cleaner launch-ready flow for the new admin.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-950 transition hover:opacity-90">{ctaLabel} <ArrowRight size={14} /></Link>
                {linkedAreas.slice(0, 2).map((item) => (
                  <Link key={item.href} href={item.href} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/[0.08]">{item.label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">What this unlocks</p>
            <div className="mt-5 space-y-3">
              {summaryCards.map((card, idx) => {
                const Icon = icons[idx % icons.length];
                return (
                  <div key={card.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-accentAlt"><Icon size={16} /></div>
                      <div>
                        <p className="text-sm font-medium text-white">{card.title}</p>
                        <p className="mt-1 text-[13px] leading-6 text-textMuted">{card.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <AmbientIllustration className="h-40" />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Suggested workflow</p>
          <div className="mt-4 space-y-3">
            {workflow.map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[12px] font-semibold text-white">{item.step}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-6 text-textMuted">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Operational notes</p>
          <div className="mt-4 space-y-3">
            {insights.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <CheckCircle2 size={16} className="mt-0.5 text-accentAlt" />
                <p className="text-[13px] leading-6 text-textMuted">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {linkedAreas.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] font-medium text-white transition hover:bg-white/[0.06]">{item.label}</Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
