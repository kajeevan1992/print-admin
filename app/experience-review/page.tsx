import Link from 'next/link';
import { ArrowRight, CheckCircle2, Eye, LayoutPanelTop, Sparkles, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';

const reviewAreas = [
  {
    title: 'Typography and spacing',
    description: 'Keep the admin calm at 100% zoom with lighter hierarchy, tighter rhythm, and more whitespace around dense controls.',
    bullets: ['Reduce heavy headings', 'Use softer card framing', 'Keep table rows visually breathable']
  },
  {
    title: 'Launch flow clarity',
    description: 'Prioritize guided wizards, inline summaries, and obvious next steps so teams can move quickly without confusion.',
    bullets: ['Prefer wizard entry points', 'Show progress and review steps', 'Link directly into the next task']
  },
  {
    title: 'Apple-like polish',
    description: 'Use illustration, glassy surfaces, restrained color, and strong negative space to make the product feel crafted.',
    bullets: ['Ambient visuals', 'Calmer shadows', 'Less boxy layouts']
  }
];

const readinessChecks = [
  ['Catalog surfaces reviewed', 'Products, categories, collections, and tags all use the lighter UI rhythm.'],
  ['Workspace improved', 'Workspace now acts as a premium launchpad instead of a utility page.'],
  ['Launch paths connected', 'Store wizard, product wizard, launch readiness, and design tools are easier to reach.']
];

export default function ExperienceReviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Experience review"
        subtitle="A visual QA space for refining the feel of the product before launch — typography, spacing, wizard clarity, and overall craftsmanship."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/workspace" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-white/[0.08]">
              Back to workspace <ArrowRight size={14} />
            </Link>
          </div>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_30%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
                <Sparkles size={12} /> Launch polish
              </div>
              <h2 className="mt-4 max-w-2xl text-[2rem] font-semibold tracking-[-0.05em] text-white">A calmer, lighter admin designed to feel finished.</h2>
              <p className="mt-3 max-w-2xl text-[13px] leading-6 text-textMuted">Use this page to keep the product honest: every screen should feel clearer at normal zoom, every workflow should have a guided starting point, and the overall shell should feel less like a dashboard and more like a product.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/launch-readiness" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-950 transition hover:opacity-90">
                  Open launch readiness <ArrowRight size={14} />
                </Link>
                <Link href="/design-studio" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-white/[0.08]">
                  Open design studio <Wand2 size={14} />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0 md:p-8">
            <AmbientIllustration className="h-full min-h-[220px]" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {reviewAreas.map((area, index) => (
          <Card key={area.title} className="space-y-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt">
              {index === 0 ? <Eye size={18} /> : index === 1 ? <LayoutPanelTop size={18} /> : <Sparkles size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">{area.title}</h2>
              <p className="mt-2 text-[13px] leading-6 text-textMuted">{area.description}</p>
            </div>
            <div className="space-y-2">
              {area.bullets.map((bullet) => (
                <div key={bullet} className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[12.5px] text-textMuted">
                  {bullet}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-300" />
          <h2 className="text-base font-semibold tracking-[-0.02em] text-white">Current readiness checks</h2>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {readinessChecks.map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">{title}</p>
              <p className="mt-2 text-[12.5px] leading-6 text-textMuted">{description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
