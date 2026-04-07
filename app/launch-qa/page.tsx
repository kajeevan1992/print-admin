import Link from 'next/link';
import { CheckCircle2, CircleAlert, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PrimaryButton } from '@/components/ui/buttons';

const checks = [
  { title: 'Catalog ready', description: 'Products, categories, collections, and tags have launch paths and guided setup routes.', icon: CheckCircle2 },
  { title: 'Storefront ready', description: 'Theme, content, and store setup routes are grouped so go-live work stays focused.', icon: ShieldCheck },
  { title: 'Visual review', description: 'Experience Review and Design Studio give one place to verify hierarchy, spacing, and premium feel.', icon: Sparkles },
  { title: 'Blocker sweep', description: 'Use Launch Readiness and notifications to spot missing work before handoff.', icon: CircleAlert }
];

const actions = [
  { href: '/launch-readiness', label: 'Open Launch Readiness' },
  { href: '/experience-review', label: 'Open Experience Review' },
  { href: '/catalog-launch-wizard', label: 'Open Catalog Wizard' },
  { href: '/store-launch-wizard', label: 'Open Store Wizard' }
];

export default function LaunchQaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Launch QA"
        subtitle="A final review board for launch confidence, handoff checks, and premium-fit polish before you ship."
        actions={<PrimaryButton>Ready for review</PrimaryButton>}
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_30%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
                <Rocket size={12} /> Launch control
              </div>
              <h2 className="mt-4 max-w-2xl text-[1.85rem] font-semibold tracking-[-0.05em] text-white">Ship with a calmer, more premium admin surface.</h2>
              <p className="mt-3 max-w-2xl text-[13px] leading-6 text-textMuted">Use this page as the last stop before launch: check catalog coverage, storefront polish, visual consistency, and release blockers.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Link key={action.href} href={action.href} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/[0.08]">
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Review sequence</p>
            <ol className="mt-4 space-y-3 text-[13px] text-textMuted">
              <li className="rounded-2xl border border-white/8 bg-black/20 p-4"><span className="font-medium text-white">1.</span> Validate launch blockers.</li>
              <li className="rounded-2xl border border-white/8 bg-black/20 p-4"><span className="font-medium text-white">2.</span> Review typography, density, and illustrations.</li>
              <li className="rounded-2xl border border-white/8 bg-black/20 p-4"><span className="font-medium text-white">3.</span> Walk through product and store wizards end to end.</li>
            </ol>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <Card key={check.title}>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-accentAlt">
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white">{check.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-textMuted">{check.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
