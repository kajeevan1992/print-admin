import Link from 'next/link';
import { ArrowRight, Boxes, CheckCircle2, FolderTree, LayoutTemplate, Tags, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';

const phases = [
  {
    title: 'Design the catalog structure',
    description: 'Create categories, collections, and tag paths that feel clean to browse and easy to manage.',
    href: '/categories',
    icon: FolderTree
  },
  {
    title: 'Shape product creation paths',
    description: 'Move from blank product, template import, or parametric setup with clearer review points.',
    href: '/product-launch-wizard',
    icon: Boxes
  },
  {
    title: 'Refine storefront discoverability',
    description: 'Balance collections, landing pages, and content so products feel curated instead of dumped into a grid.',
    href: '/content',
    icon: LayoutTemplate
  }
];

const checklist = [
  'Primary categories, child categories, and naming rules agreed',
  'Collection strategy defined for B2B, campaigns, or organization-based access',
  'Tags designed for cross-category discovery and SEO browse pages',
  'Launch content identified for the storefront homepage and landing pages'
];

export default function CatalogLaunchWizardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog Launch Wizard"
        subtitle="A guided path for building a polished catalog structure — products, categories, collections, and content — before the storefront goes live."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
              <Wand2 size={12} /> Guided catalog workflow
            </div>
            <h2 className="mt-4 max-w-2xl text-[1.95rem] font-semibold tracking-[-0.05em] text-white">
              Build a catalog that feels curated, searchable, and easy to scale.
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-textMuted">
              Use this when you want to launch faster without sacrificing structure. It keeps product creation, taxonomy, and storefront presentation aligned from the start.
            </p>

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
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/categories" className="rounded-xl bg-white px-4 py-2 text-[12px] font-semibold text-slate-950">Open Categories</Link>
              <Link href="/collections" className="rounded-xl border border-white/8 px-4 py-2 text-[12px] font-medium text-white">Open Collections</Link>
              <Link href="/tags" className="rounded-xl border border-white/8 px-4 py-2 text-[12px] font-medium text-white">Open Tags</Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><FolderTree size={18} /></div>
          <h3 className="text-lg font-semibold text-white">Taxonomy first</h3>
          <p className="text-sm leading-6 text-textMuted">Start with categories and collections before bulk-creating products. It makes permissions, navigation, and launch pages much cleaner.</p>
        </Card>
        <Card className="space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><Boxes size={18} /></div>
          <h3 className="text-lg font-semibold text-white">Products with context</h3>
          <p className="text-sm leading-6 text-textMuted">Use the product wizard once the catalog shape is clear. That reduces rework around pricing, tags, and storefront placement.</p>
        </Card>
        <Card className="space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><Tags size={18} /></div>
          <h3 className="text-lg font-semibold text-white">Discovery that scales</h3>
          <p className="text-sm leading-6 text-textMuted">Tagging and landing page support helps the storefront feel premium, curated, and easier to search than a flat catalog.</p>
        </Card>
      </div>
    </div>
  );
}
