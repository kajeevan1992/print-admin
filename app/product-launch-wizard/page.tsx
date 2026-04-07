import Link from 'next/link';
import { CheckCircle2, ChevronRight, Layers3, Palette, Rocket } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const steps = [
  {
    title: 'Choose the foundation',
    description: 'Start from IDML, a blank product, a Print Editor template, or a parametric standard.',
    href: '/products'
  },
  {
    title: 'Prepare structure and pricing',
    description: 'Map categories, pricing rules, dimensions, and publishing defaults before launch.',
    href: '/pricing'
  },
  {
    title: 'Refine content and storefront visibility',
    description: 'Tie the product to collections, tags, page content, and theme presentation.',
    href: '/content'
  }
];

const checklist = [
  'Category selected and storefront path confirmed',
  'Pricing and proofing path reviewed',
  'Product content and tags ready for publish',
  'Store assignment and theme preview checked'
];

export default function ProductLaunchWizardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Launch Wizard"
        subtitle="A guided path for bringing a print product to life with less back-and-forth between setup, pricing, and storefront readiness."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_30%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
                <Rocket size={12} /> Guided launch
              </div>
              <h2 className="mt-4 max-w-2xl text-[2.2rem] font-semibold tracking-[-0.05em] text-white">Take a product from concept to storefront with a cleaner flow.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-textMuted">Use this as your preferred starting point when you want a calmer, more premium path than opening a raw admin list page first.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {steps.map((step, index) => (
                  <Link key={step.title} href={step.href} className="rounded-2xl border border-white/8 bg-black/20 p-4 transition hover:bg-white/[0.05]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white">{index + 1}</div>
                    <p className="mt-4 text-sm font-medium text-white">{step.title}</p>
                    <p className="mt-1 text-[13px] leading-6 text-textMuted">{step.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accentAlt">Open <ChevronRight size={14} /></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Launch checklist</p>
            <div className="mt-5 space-y-3">
              {checklist.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <CheckCircle2 size={18} className="mt-0.5 text-accentAlt" />
                  <p className="text-[13px] leading-6 text-white/90">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3 text-white">
                <Layers3 size={18} className="text-accentAlt" />
                <p className="text-sm font-medium">Recommended next step</p>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-textMuted">Begin in Products to create the record, then flow into Pricing and Content for launch readiness.</p>
              <div className="mt-4 flex gap-2">
                <Link href="/products" className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-slate-950">Go to Products</Link>
                <Link href="/themes" className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2 text-[13px] font-medium text-white"><Palette size={14} /> Theme Preview</Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
