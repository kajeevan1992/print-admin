import Link from 'next/link';
import { AlertTriangle, ArrowRight, BadgeCheck, Boxes, Globe2, Palette, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';

const readinessAreas = [
  {
    title: 'Catalog readiness',
    description: 'Validate products, categories, collections, and tags before pushing customers into the storefront.',
    href: '/catalog-launch-wizard',
    score: '92%',
    icon: Boxes,
    checks: ['Products in key categories', 'Tags and collections aligned', 'Launch content drafted']
  },
  {
    title: 'Storefront readiness',
    description: 'Review general settings, theme, channel availability, and launch experience in one place.',
    href: '/store-launch-wizard',
    score: '88%',
    icon: Globe2,
    checks: ['Store switcher verified', 'Theme visuals reviewed', 'Launch settings checked']
  },
  {
    title: 'Brand readiness',
    description: 'Keep visual consistency under control with faster access to design studio and content routes.',
    href: '/design-studio',
    score: '84%',
    icon: Palette,
    checks: ['Landing pages ready', 'Core content linked', 'Visual polish pass pending']
  }
];

const blockers = [
  'Review storefront mobile empty states',
  'Approve final launch announcement content',
  'Confirm promotion code visibility for launch traffic'
];

export default function LaunchReadinessPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Launch Readiness"
        subtitle="A calmer pre-launch checklist for catalog, storefront, and brand work — designed to help teams ship without losing confidence."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_34%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-textMuted">
                <Sparkles size={12} /> Launch confidence layer
              </div>
              <h2 className="mt-4 max-w-2xl text-[2.1rem] font-semibold tracking-[-0.05em] text-white">Ship with fewer unknowns.</h2>
              <p className="mt-3 max-w-2xl text-[13px] leading-6 text-textMuted">Use this page before launch day to review the three areas that usually create last-minute stress: catalog structure, storefront setup, and content polish.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/catalog-launch-wizard" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-950 transition hover:opacity-90">Open catalog wizard <ArrowRight size={14} /></Link>
                <Link href="/store-launch-wizard" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-white/[0.08]">Open store wizard <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0 md:p-8">
            <AmbientIllustration className="h-48" />
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                <div className="flex items-center gap-2 text-white"><ShieldCheck size={16} className="text-emerald-300" /><p className="text-sm font-medium">Recommended final pass</p></div>
                <p className="mt-2 text-[12px] leading-6 text-textMuted">Review the launch flow at 100% zoom after content and theme changes so spacing, contrast, and wizard rhythm feel intentional.</p>
              </div>
              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
                <div className="flex items-center gap-2 text-white"><AlertTriangle size={16} className="text-amber-300" /><p className="text-sm font-medium">Open blockers</p></div>
                <ul className="mt-2 space-y-1 text-[12px] leading-6 text-textMuted">{blockers.map((item) => <li key={item}>• {item}</li>)}</ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {readinessAreas.map((area) => {
          const Icon = area.icon;
          return (
            <Card key={area.title} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><Icon size={17} /></div>
                <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white">{area.score}</div>
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{area.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-textMuted">{area.description}</p>
              </div>
              <div className="space-y-2">
                {area.checks.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-text"><BadgeCheck size={13} className="text-emerald-300" /> {item}</div>
                ))}
              </div>
              <Link href={area.href} className="inline-flex items-center gap-2 text-[12px] font-medium text-accentAlt">Open workflow <ArrowRight size={14} /></Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
