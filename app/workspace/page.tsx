import Link from 'next/link';
import { ArrowRight, Command, Globe2, Layers3, Sparkles, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';

const sections = [
  {
    title: 'Catalog control',
    description: 'Products, categories, collections, and tags with guided entry points for day-to-day merchandising.',
    links: [
      { href: '/product-launch-wizard', label: 'Launch product wizard' },
      { href: '/products', label: 'Open products' },
      { href: '/categories', label: 'Open categories' },
      { href: '/collections', label: 'Open collections' }
    ]
  },
  {
    title: 'Commerce operations',
    description: 'Flow from quote to order to production without losing context between teams.',
    links: [
      { href: '/orders', label: 'Open orders' },
      { href: '/quotes', label: 'Open quotations' },
      { href: '/production', label: 'Open production' },
      { href: '/customers', label: 'Open customers' }
    ]
  },
  {
    title: 'Storefront and content',
    description: 'Move from theme changes to campaign pages and catalog visibility with fewer clicks.',
    links: [
      { href: '/channels', label: 'Open print store' },
      { href: '/themes', label: 'Open site theme' },
      { href: '/content', label: 'Open content hub' },
      { href: '/landing-pages', label: 'Open landing pages' }
    ]
  },
  {
    title: 'Store launch',
    description: 'Bring new storefronts online with a guided route through store setup, theme review, and go-live checks.',
    links: [
      { href: '/store-launch-wizard', label: 'Open store wizard' },
      { href: '/print-store', label: 'Open print store' },
      { href: '/general-settings', label: 'Open general settings' },
      { href: '/site-theme', label: 'Open site theme' }
    ]
  }
];

const wizardSteps = [
  {
    step: '01',
    title: 'Shape the product',
    description: 'Choose the creation method, core dimensions, and storefront category.'
  },
  {
    step: '02',
    title: 'Design the experience',
    description: 'Define editor behavior, content, and presentation with theme-friendly defaults.'
  },
  {
    step: '03',
    title: 'Launch with confidence',
    description: 'Review publishing, pricing readiness, and store availability before go-live.'
  }
];

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        subtitle="A calmer launchpad for the busiest admin workflows — designed to feel more like a polished product than a control panel."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_32%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
                <Sparkles size={12} /> Product-grade admin UX
              </div>
              <h2 className="mt-4 max-w-2xl text-[2.35rem] font-semibold tracking-[-0.05em] text-white">
                Guided flows for catalog, commerce, and storefront work.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-textMuted">
                Start with a wizard, jump into a focused workspace, or hand work across teams without hunting for the next page.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/product-launch-wizard" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-950 transition hover:opacity-90">
                  Start product wizard <ArrowRight size={14} />
                </Link>
                <Link href="/command-center" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/[0.08]">
                  Open command center <Command size={14} />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Launch wizard preview</p>
            <div className="mt-5 space-y-3">
              {wizardSteps.map((step) => (
                <div key={step.step} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-[12px] font-semibold text-white">{step.step}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{step.title}</p>
                      <p className="mt-1 text-[13px] leading-6 text-textMuted">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <AmbientIllustration className="h-48" />

      <div className="grid gap-4 xl:grid-cols-4">
        {sections.map((section, index) => (
          <Card key={section.title} className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt">
                  {index === 0 ? <Layers3 size={18} /> : index === 1 ? <Command size={18} /> : index === 2 ? <Wand2 size={18} /> : <Globe2 size={18} />}
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-textMuted">{section.description}</p>
              </div>
            </div>
            <div className="space-y-2">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] font-medium text-white transition hover:bg-white/[0.06]"
                >
                  {link.label}
                  <ArrowRight size={14} className="text-textMuted" />
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
