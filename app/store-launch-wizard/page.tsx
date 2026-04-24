export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Globe2, LayoutPanelTop, Palette, ShieldCheck, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';

const phases = [
  {
    title: 'Configure the store identity',
    description: 'Set up storefront basics, domains, organization ownership, billing context, and publishing direction.',
    href: '/print-store',
    icon: Store
  },
  {
    title: 'Shape the visual system',
    description: 'Tune theme, landing pages, snippets, and content structure before customer traffic arrives.',
    href: '/site-theme',
    icon: Palette
  },
  {
    title: 'Secure checkout and go live',
    description: 'Review shipping, tax, notifications, checkout fields, and operational readiness.',
    href: '/general-settings',
    icon: ShieldCheck
  }
];

const checklist = [
  'Store name, domain, and organization confirmed',
  'Theme, landing page, and key content reviewed',
  'Checkout fields, shipping, tax, and email verified',
  'Support and production visibility paths prepared'
];

export default function StoreLaunchWizardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Launch Wizard"
        subtitle="A calmer path for bringing a storefront live — from brand setup and content to checkout readiness and operational review."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
              <Globe2 size={12} /> Store-grade workflow
            </div>
            <h2 className="mt-4 max-w-2xl text-[2rem] font-semibold tracking-[-0.05em] text-white">Launch a storefront with fewer handoffs and cleaner review points.</h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-textMuted">Use this guided path when a new storefront, portal, || client experience needs a polished setup rather than a list of disconnected admin pages.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {phases.map((phase, index) => {
                const Icon = phase.icon;
                return (
                  <Link key={phase.title} href={phase.href} className="rounded-[22px] border border-white/8 bg-black/20 p-4 transition hover:bg-white/[0.05]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-accentAlt"><Icon size={17} /></div>
                    <p className="mt-4 text-sm font-medium text-white">0{index + 1} · {phase.title}</p>
                    <p className="mt-1 text-[12px] leading-6 text-textMuted">{phase.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-accentAlt">Open <ArrowRight size={14} /></span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0 md:p-8">
            <AmbientIllustration className="h-44" />
            <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-textMuted">Readiness checklist</p>
            <div className="mt-4 space-y-3">
              {checklist.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <CheckCircle2 size={17} className="mt-0.5 text-accentAlt" />
                  <p className="text-[12px] leading-6 text-white/90">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-white">
                <LayoutPanelTop size={16} className="text-accentAlt" />
                <p className="text-sm font-medium">Recommended starting points</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/print-store" className="rounded-xl bg-white px-4 py-2 text-[12px] font-semibold text-slate-950">Open Print Store</Link>
                <Link href="/site-theme" className="rounded-xl border border-white/8 px-4 py-2 text-[12px] font-medium text-white">Open Site Theme</Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
